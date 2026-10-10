import pptxgen from 'pptxgenjs';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
} from 'docx';
import type { PresentationDeck, WeeklyRecap } from '@/types/report';

/**
 * Server-side Generator: Microsoft PowerPoint (.pptx)
 */
export async function generatePptxBuffer(deck: PresentationDeck): Promise<Buffer> {
  const pres = new pptxgen();

  pres.layout = 'LAYOUT_WIDE'; // 16:9 Widescreen
  pres.author = deck.author || 'Peserta Pemagangan Nasional';
  pres.company = deck.institution || 'Maganghub Kemnaker';
  pres.title = deck.title;
  pres.subject = deck.subtitle;

  // Slide 1: Title Slide (Cover Profesional)
  const slide1 = pres.addSlide();
  slide1.background = { color: '09090B' };

  // Aksen dekoratif garis cyan
  slide1.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 1.0,
    w: 0.15,
    h: 5.2,
    fill: { color: '22D3EE' },
  });

  slide1.addText(deck.institution?.toUpperCase() || 'MAGANGHUB KEMNAKER RI', {
    x: 1.2,
    y: 1.2,
    w: 11.0,
    h: 0.4,
    fontSize: 12,
    fontFace: 'Arial',
    color: '22D3EE',
    bold: true,
  });

  slide1.addText(deck.title, {
    x: 1.2,
    y: 1.7,
    w: 10.8,
    h: 1.6,
    fontSize: 28,
    fontFace: 'Arial',
    color: 'FFFFFF',
    bold: true,
  });

  slide1.addText(deck.subtitle, {
    x: 1.2,
    y: 3.4,
    w: 10.8,
    h: 0.8,
    fontSize: 14,
    fontFace: 'Arial',
    color: 'A1A1AA',
  });

  // Kotak Info Pembuat
  slide1.addShape(pres.ShapeType.roundRect, {
    x: 1.2,
    y: 4.6,
    w: 8.5,
    h: 1.3,
    fill: { color: '18181B' },
    line: { color: '27272A', width: 1 },
    rectRadius: 0.1,
  });

  slide1.addText(
    [
      { text: 'Disusun oleh: ', options: { color: '71717A', bold: false } },
      { text: `${deck.author}\n`, options: { color: 'FFFFFF', bold: true } },
      { text: 'Periode Laporan: ', options: { color: '71717A', bold: false } },
      { text: deck.period, options: { color: '22D3EE', bold: true } },
    ],
    {
      x: 1.5,
      y: 4.8,
      w: 8.0,
      h: 0.9,
      fontSize: 12,
      fontFace: 'Arial',
    }
  );

  if (deck.slides[0]?.speaker_notes) {
    slide1.addNotes(deck.slides[0].speaker_notes);
  }

  // Slide Konten (Slide 2 s/d selesai)
  const contentSlides = deck.slides.length > 1 ? deck.slides.slice(1) : deck.slides;

  contentSlides.forEach((s, idx) => {
    const slide = pres.addSlide();
    slide.background = { color: '09090B' };

    // Header Slide
    slide.addText((s.tag || 'LAPORAN MAGANG').toUpperCase(), {
      x: 0.8,
      y: 0.6,
      w: 8.0,
      h: 0.3,
      fontSize: 10,
      fontFace: 'Arial',
      color: '22D3EE',
      bold: true,
    });

    slide.addText(s.title, {
      x: 0.8,
      y: 0.9,
      w: 11.5,
      h: 0.8,
      fontSize: 22,
      fontFace: 'Arial',
      color: 'FFFFFF',
      bold: true,
    });

    if (s.subtitle) {
      slide.addText(s.subtitle, {
        x: 0.8,
        y: 1.7,
        w: 11.5,
        h: 0.4,
        fontSize: 12,
        fontFace: 'Arial',
        color: 'A1A1AA',
      });
    }

    // Garis Pemisah Tipis
    slide.addShape(pres.ShapeType.line, {
      x: 0.8,
      y: 2.1,
      w: 11.7,
      h: 0,
      line: { color: '27272A', width: 1 },
    });

    // Konten Poin Utama (Bullet Points dengan wrap & auto-scale tanpa potongan)
    const fontSize = s.bullets.length > 5 ? 10 : s.bullets.length > 3 ? 11 : 12;
    const lineSpacing = s.bullets.length > 5 ? 18 : 22;

    const bulletItems = s.bullets.map((b) => ({
      text: b,
      options: {
        fontSize,
        color: 'F4F4F5',
        bullet: true,
        lineSpacing,
      },
    }));

    slide.addText(bulletItems, {
      x: 0.8,
      y: 2.3,
      w: 11.7,
      h: 4.1,
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
      autoFit: true,
    });

    // Footer Slide
    slide.addText(`${deck.author} • ${deck.institution} | Slide ${idx + 2} dari ${deck.slides.length}`, {
      x: 0.8,
      y: 6.6,
      w: 11.5,
      h: 0.4,
      fontSize: 9,
      fontFace: 'Arial',
      color: '71717A',
    });

    if (s.speaker_notes) {
      slide.addNotes(s.speaker_notes);
    }
  });

  const buffer = (await pres.write({ outputType: 'nodebuffer' })) as Buffer;
  return buffer;
}

/**
 * Server-side Generator: Microsoft Word (.docx)
 */
export async function generateDocxBuffer(
  recap: WeeklyRecap,
  authorName = 'Peserta Pemagangan Nasional',
  instanceName = 'Instansi Pemagangan'
): Promise<Buffer> {
  const tableBorderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // Header Dokumen Resmi
          new Paragraph({
            text: 'LAPORAN REKAPITULASI MINGGUAN PEMAGANGAN',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            text: 'PROGRAM PEMAGANGAN NASIONAL — KEMNAKER RI',
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
          }),
          new Paragraph({
            text: '_________________________________________________________________________________',
            alignment: AlignmentType.CENTER,
            spacing: { after: 280 },
          }),

          // Tabel Metadata Peserta
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Nama Peserta', bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [new Paragraph({ text: `: ${authorName}` })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Instansi / Mitra', bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [new Paragraph({ text: `: ${instanceName}` })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Periode Minggu', bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [new Paragraph({ text: `: ${recap.week_label} (${recap.period})` })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [new Paragraph({ children: [new TextRun({ text: 'Total Hari Lapor', bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [new Paragraph({ text: `: ${recap.total_days} Hari Kerja Terverifikasi` })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { after: 240 } }),

          // Bab 1: Rangkuman Kegiatan
          new Paragraph({
            text: 'I. RINGKASAN AKTIVITAS MINGGUAN',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
          }),
          new Paragraph({
            text: recap.summary,
            alignment: AlignmentType.BOTH,
            spacing: { after: 200 },
          }),

          // Bab 2: Pencapaian Utama
          new Paragraph({
            text: 'II. PENCAPAIAN UTAMA & HASIL KERJA',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
          }),
          ...recap.key_achievements.map(
            (ach) =>
              new Paragraph({
                text: `•  ${ach}`,
                spacing: { after: 80 },
              })
          ),

          // Bab 3: Pembelajaran Kunci
          new Paragraph({
            text: 'III. KOMPETENSI & PEMBELAJARAN YANG DIPEROLEH',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
          }),
          ...recap.key_learnings.map(
            (lrn) =>
              new Paragraph({
                text: `•  ${lrn}`,
                spacing: { after: 80 },
              })
          ),

          // Bab 4: Kendala & Solusi
          new Paragraph({
            text: 'IV. EVALUASI KENDALA & SOLUSI LAPANGAN',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
          }),
          ...recap.obstacles_and_solutions.map(
            (obs) =>
              new Paragraph({
                text: `•  ${obs}`,
                spacing: { after: 80 },
              })
          ),

          // Bab 5: Rencana Minggu Depan
          new Paragraph({
            text: 'V. RENCANA KERJA MINGGU BERIKUTNYA',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
          }),
          ...recap.next_week_plan.map(
            (plan) =>
              new Paragraph({
                text: `•  ${plan}`,
                spacing: { after: 80 },
              })
          ),

          new Paragraph({ text: '', spacing: { after: 400 } }),

          // Lembar Tanda Tangan Formal
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({ text: 'Mengetahui,', alignment: AlignmentType.CENTER }),
                      new Paragraph({ text: 'Pembimbing Lapangan / Mentor', alignment: AlignmentType.CENTER, spacing: { after: 800 } }),
                      new Paragraph({ text: '( __________________________ )', alignment: AlignmentType.CENTER }),
                      new Paragraph({ text: 'NIP/NIK: ....................................', alignment: AlignmentType.CENTER }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorderNone,
                    children: [
                      new Paragraph({ text: 'Disusun oleh,', alignment: AlignmentType.CENTER }),
                      new Paragraph({ text: 'Peserta Pemagangan', alignment: AlignmentType.CENTER, spacing: { after: 800 } }),
                      new Paragraph({ text: `( ${authorName} )`, alignment: AlignmentType.CENTER }),
                      new Paragraph({ text: 'Peserta Maganghub Kemnaker', alignment: AlignmentType.CENTER }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
