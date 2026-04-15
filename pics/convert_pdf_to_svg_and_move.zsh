#!/bin/zsh

# Script to convert PDF graphics to SVG, remove PDFs, and move SVGs to ../pics
# Usage: ./convert_pdfs.zsh [directory]
# If no directory is specified, uses current directory

# Determine the folder argument
FOLDER=$1

# Check if argument was provided
if [ -z "$FOLDER" ]; then
    echo "Fehler: Bitte gib einen Ordner an!"
    echo "Verwendung: $0 <ordner>"
    exit 1
fi

# Set directories
SOURCE_DIR="$FOLDER"
DEST_DIR="../../thma_mathematics01/$FOLDER/pics/"

# Create destination directory if it doesn't exist
#mkdir -p "$DEST_DIR"

# Check if pdf2svg is installed
if ! command -v pdf2svg &> /dev/null; then
    echo "Error: pdf2svg is not installed."
    echo "Install it with: brew install pdf2svg (macOS) or apt install pdf2svg (Linux)"
    exit 1
fi

# Counter for processed files
count=0

# Find all PDF files in the source directory
for pdf_file in "$SOURCE_DIR"/*.pdf(N); do
    # Check if any PDF files were found
    if [[ ! -e "$pdf_file" ]]; then
        echo "No PDF files found in $SOURCE_DIR"
        exit 0
    fi
    
    # Get the base filename without extension
    base_name="${pdf_file:t:r}"
    
    # Define the SVG output path (temporary, in same directory as PDF)
    svg_file="${pdf_file:h}/${base_name}.svg"
    
    echo "Converting: ${pdf_file:t} -> ${base_name}.svg"
    
    # Convert PDF to SVG
    if pdf2svg "$pdf_file" "$svg_file"; then
        echo "  ✓ Converted successfully"
        
        # Remove the original PDF
        rm "$pdf_file"
        echo "  ✓ Removed PDF"
        
        # Move SVG to destination directory
        mv "$svg_file" "$DEST_DIR/"
        echo "  ✓ Moved to $DEST_DIR/"
        
        ((count++))
    else
        echo "  ✗ Error converting $pdf_file"
    fi
    
    echo ""
done

echo "Completed! Processed $count PDF file(s)."
