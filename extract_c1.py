import pypdf

pdf_path = "/Users/servaaswinder/Documents/GitHub/Website/Leerling opdrachten/C opdrachten/Doelstellingen (C1)/WarmingStripes (C1).pdf"

try:
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    print(text)
except Exception as e:
    print(f"Error: {e}")
