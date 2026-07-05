(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  // ---------------------------------------------------------------
  // Home page: upload form
  // ---------------------------------------------------------------
  function wireUploadForm() {
    var form = byId("auditForm");
    if (!form) return;

    var fileInput = byId("documentationPdf");
    var dropzone = byId("dropzone");
    var filenameLabel = byId("filenameLabel");
    var errorBanner = byId("errorBanner");
    var submitBtn = byId("submitBtn");

    fileInput.addEventListener("change", function () {
      filenameLabel.textContent = fileInput.files.length ? fileInput.files[0].name : "";
    });

    ["dragover", "dragenter"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
      });
    });

    dropzone.addEventListener("drop", function (e) {
      var files = e.dataTransfer.files;
      if (files && files.length) {
        fileInput.files = files;
        filenameLabel.textContent = files[0].name;
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      errorBanner.style.display = "none";

      submitBtn.disabled = true;
      submitBtn.textContent = "Starting audit…";

      var payload = new FormData(form);

      fetch("/api/audits", { method: "POST", body: payload })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) throw new Error(data.error || "Could not start the audit.");
            return data;
          });
        })
        .then(function (data) {
          window.location.href = "/audits/" + data.auditId;
        })
        .catch(function (err) {
          errorBanner.textContent = err.message;
          errorBanner.style.display = "block";
          submitBtn.disabled = false;
          submitBtn.textContent = "Run compliance audit";
        });
    });
  }

  // ---------------------------------------------------------------
  // Audit page: status polling + results rendering
  // ---------------------------------------------------------------
  var STAGE_ORDER = ["queued", "reading_blueprint", "inspecting_surface", "reconciling", "completed"];

  function stageIndex(status) {
    var idx = STAGE_ORDER.indexOf(status);
    return idx === -1 ? 0 : idx;
  }

  function updateStepper(status) {
    var steps = document.querySelectorAll("#stepper .step");
    var currentIndex = stageIndex(status);

    steps.forEach(function (step) {
      var stage = step.getAttribute("data-stage");
      var stepIdx = stageIndex(stage);
      step.classList.remove("active", "done", "failed");

      if (status === "failed") {
        if (stepIdx <= currentIndex) step.classList.add("failed");
        return;
      }

      if (stepIdx < currentIndex || status === "completed") {
        step.classList.add("done");
      } else if (stepIdx === currentIndex) {
        step.classList.add("active");
      }
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderPending() {
    byId("resultsArea").innerHTML =
      '<div class="empty-state"><span class="spinner"></span>&nbsp;&nbsp;Working through the pipeline — this page updates automatically.</div>';
  }

  function renderResults(auditId, audit, pages) {
    var overall = audit.overallScore != null ? audit.overallScore : 0;

    var html = '<div class="summary-strip">';
    html += '<div><div class="pill ' + overallPill(overall) + '">Overall</div>';
    html += '<div class="score">' + overall + "%</div></div>";
    html += '<div style="display:flex;gap:12px;">';
    html += '<a class="btn ghost" href="/api/audits/' + auditId + '/dashboard-report" target="_blank">Open dashboard report</a>';
    html += '<a class="btn ghost" href="/api/audits/' + auditId + '/bundle">Download all reports (.zip)</a>';
    html += "</div></div>";

    html += '<div class="page-grid">';
    pages.forEach(function (page) {
      html += '<div class="page-card">';
      html += "<h3>" + escapeHtml(page.pageTitle) + "</h3>";
      html += '<div class="score-line"><span class="n">' + page.complianceScore + '%</span><span class="pill ' + page.status + '">' + page.status + "</span></div>";
      html += '<div class="counts">';
      html += "<span>" + page.matched.length + " matched</span>";
      html += "<span>" + page.missing.length + " missing</span>";
      html += "<span>" + page.extra.length + " extra</span>";
      html += "</div>";
      html += '<div class="actions">';
      html += '<button class="link-btn" data-toggle-report="' + page.pageKey + '">View report ▾</button>';
      html += '<a class="link-btn" href="/api/audits/' + auditId + "/pages/" + page.pageKey + '/report" target="_blank">Open in new tab</a>';
      html += "</div>";
      html += '<iframe id="frame-' + page.pageKey + '" src="/api/audits/' + auditId + "/pages/" + page.pageKey + '/report" loading="lazy"></iframe>';
      html += "</div>";
    });
    html += "</div>";

    if (pages.length === 0) {
      html += '<div class="empty-state">No screens could be reconciled for this audit.</div>';
    }

    byId("resultsArea").innerHTML = html;

    document.querySelectorAll("[data-toggle-report]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-toggle-report");
        var frame = byId("frame-" + key);
        var visible = frame.style.display === "block";
        frame.style.display = visible ? "none" : "block";
        btn.textContent = visible ? "View report ▾" : "Hide report ▴";
      });
    });
  }

  function overallPill(score) {
    if (score >= 90) return "PASS";
    if (score >= 70) return "WARNING";
    return "FAIL";
  }

  function pollAuditStatus() {
    var auditId = window.__AUDIT_ID__;
    if (!auditId) return;

    renderPending();

    function poll() {
      fetch("/api/audits/" + auditId)
        .then(function (r) { return r.json(); })
        .then(function (audit) {
          updateStepper(audit.status);

          if (audit.status === "failed") {
            var box = byId("failureBox");
            box.textContent = audit.errorMessage || "The audit failed for an unknown reason.";
            box.style.display = "block";
            byId("resultsArea").innerHTML = "";
            return;
          }

          if (audit.status === "completed") {
            fetch("/api/audits/" + auditId + "/pages")
              .then(function (r) { return r.json(); })
              .then(function (pages) {
                renderResults(auditId, audit, pages);
              });
            return;
          }

          setTimeout(poll, 2500);
        })
        .catch(function () {
          setTimeout(poll, 4000);
        });
    }

    poll();
  }

  wireUploadForm();
  pollAuditStatus();
})();
