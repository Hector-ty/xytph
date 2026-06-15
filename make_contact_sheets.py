from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"D:\thxy")
PAGE_DIR = ROOT / "rendered_spec_word" / "pages"
OUT_DIR = ROOT / "rendered_spec_word" / "contact_sheets"


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pages = sorted(PAGE_DIR.glob("page-*.png"))
    pages_per_sheet = 4
    thumb_width = 510
    gutter = 24
    label_height = 30

    for sheet_index in range(0, len(pages), pages_per_sheet):
        selected = pages[sheet_index:sheet_index + pages_per_sheet]
        thumbs = []
        for path in selected:
            image = Image.open(path).convert("RGB")
            ratio = thumb_width / image.width
            thumb = image.resize((thumb_width, int(image.height * ratio)))
            thumbs.append((path, thumb))

        sheet_width = thumb_width * 2 + gutter * 3
        row_height = max(thumb.height for _, thumb in thumbs) + label_height + gutter
        sheet_height = row_height * 2 + gutter
        sheet = Image.new("RGB", (sheet_width, sheet_height), "white")
        draw = ImageDraw.Draw(sheet)

        for index, (path, thumb) in enumerate(thumbs):
            col = index % 2
            row = index // 2
            x = gutter + col * (thumb_width + gutter)
            y = gutter + row * row_height
            draw.text((x, y), path.stem, fill="black")
            sheet.paste(thumb, (x, y + label_height))
            draw.rectangle(
                (x, y + label_height, x + thumb.width, y + label_height + thumb.height),
                outline="#9aa4af",
                width=1,
            )

        output = OUT_DIR / f"sheet-{sheet_index // pages_per_sheet + 1:02d}.png"
        sheet.save(output)
        print(output)


if __name__ == "__main__":
    main()
