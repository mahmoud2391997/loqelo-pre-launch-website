from pathlib import Path
import fitz

source = Path("attached_assets/Brief_1792752210131.pdf")
output = Path(".agents/outputs/loqelo-brief")
output.mkdir(parents=True, exist_ok=True)

doc = fitz.open(source)
print(f"Pages: {doc.page_count}")
for index, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    destination = output / f"page-{index + 1}.png"
    pix.save(destination)
    print(destination)
