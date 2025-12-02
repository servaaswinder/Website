import pypdf

pdf_path = "/Users/servaaswinder/Documents/GitHub/Website/Leerling opdrachten/B opdrachten/Introductie HTML B4.pdf"

try:
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    print(text)
except Exception as e:
    print(f"Error: {e}")
