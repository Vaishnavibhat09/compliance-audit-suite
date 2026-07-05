import { db } from "../database";
import { newId } from "../../utils/idGenerator";
import { BlueprintSection } from "../../types";

interface BlueprintRow {
  id: string;
  audit_id: string;
  title: string;
  page_number: number;
  content: string;
  buttons_json: string;
  forms_json: string;
  headers_json: string;
  cards_json: string;
  tabs_json: string;
  badges_json: string;
  charts_json: string;
}

function toSection(row: BlueprintRow): BlueprintSection {
  return {
    title: row.title,
    page: row.page_number,
    content: row.content,
    buttons: JSON.parse(row.buttons_json),
    formFields: JSON.parse(row.forms_json),
    tableHeaders: JSON.parse(row.headers_json),
    cards: JSON.parse(row.cards_json),
    tabs: JSON.parse(row.tabs_json),
    badges: JSON.parse(row.badges_json),
    charts: JSON.parse(row.charts_json),
  };
}

export const blueprintRepository = {
  saveAll(auditId: string, sections: BlueprintSection[]): void {
    const insert = db.prepare(
      `INSERT INTO blueprint_sections
        (id, audit_id, title, page_number, content, buttons_json, forms_json, headers_json, cards_json, tabs_json, badges_json, charts_json)
       VALUES (@id, @auditId, @title, @page, @content, @buttons, @forms, @headers, @cards, @tabs, @badges, @charts)`
    );

    const transaction = db.transaction((rows: BlueprintSection[]) => {
      for (const section of rows) {
        insert.run({
          id: newId("bp"),
          auditId,
          title: section.title,
          page: section.page,
          content: section.content,
          buttons: JSON.stringify(section.buttons),
          forms: JSON.stringify(section.formFields),
          headers: JSON.stringify(section.tableHeaders),
          cards: JSON.stringify(section.cards),
          tabs: JSON.stringify(section.tabs),
          badges: JSON.stringify(section.badges),
          charts: JSON.stringify(section.charts),
        });
      }
    });

    transaction(sections);
  },

  listForAudit(auditId: string): BlueprintSection[] {
    const rows = db
      .prepare(`SELECT * FROM blueprint_sections WHERE audit_id = ?`)
      .all(auditId) as BlueprintRow[];
    return rows.map(toSection);
  },
};
