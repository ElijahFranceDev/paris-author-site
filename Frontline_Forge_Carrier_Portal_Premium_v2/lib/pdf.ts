import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const gold = rgb(0.78, 0.62, 0.22);
const black = rgb(0.04, 0.04, 0.04);
const gray = rgb(0.35, 0.35, 0.35);

export async function createSimplePdf(input: {
  title: string;
  subtitle: string;
  sections: Array<{ heading: string; lines: string[] }>;
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([792, 612]);
  let y = 560;

  const header = () => {
    page.drawRectangle({ x: 0, y: 518, width: 792, height: 94, color: black });
    page.drawRectangle({ x: 0, y: 514, width: 792, height: 4, color: gold });
    page.drawText("FRONTLINE FORGE SOLUTIONS", { x: 34, y: 574, size: 19, font: bold, color: gold });
    page.drawText(input.title, { x: 34, y: 547, size: 15, font: bold, color: rgb(1, 1, 1) });
    page.drawText(input.subtitle, { x: 34, y: 529, size: 9, font: regular, color: rgb(0.82, 0.82, 0.82) });
    y = 490;
  };

  const addPage = () => {
    page = pdf.addPage([792, 612]);
    header();
  };

  header();

  for (const section of input.sections) {
    if (y < 90) addPage();
    page.drawText(section.heading, { x: 34, y, size: 12, font: bold, color: gold });
    y -= 20;
    for (const line of section.lines) {
      if (y < 50) addPage();
      const chunks = line.match(/.{1,105}(?:\s|$)/g) || [line];
      for (const chunk of chunks) {
        page.drawText(chunk.trim(), { x: 44, y, size: 9, font: regular, color: gray });
        y -= 14;
      }
    }
    y -= 10;
  }

  return pdf.save();
}
