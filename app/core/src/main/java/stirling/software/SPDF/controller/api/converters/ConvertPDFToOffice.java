package stirling.software.SPDF.controller.api.converters;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.BreakType;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;

import lombok.RequiredArgsConstructor;

import stirling.software.SPDF.model.api.converters.PdfToPresentationRequest;
import stirling.software.SPDF.model.api.converters.PdfToTextOrRTFRequest;
import stirling.software.SPDF.model.api.converters.PdfToWordRequest;
import stirling.software.SPDF.pdf.parser.PdfModels.TableFragment;
import stirling.software.SPDF.pdf.parser.TabulaTableParser;
import stirling.software.common.annotations.AutoJobPostMapping;
import stirling.software.common.annotations.api.ConvertApi;
import stirling.software.common.configuration.RuntimePathConfig;
import stirling.software.common.enumeration.ResourceWeight;
import stirling.software.common.model.api.PDFFile;
import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.util.GeneralUtils;
import stirling.software.common.util.PDFToFile;
import stirling.software.common.util.TempFile;
import stirling.software.common.util.TempFileManager;
import stirling.software.common.util.WebResponseUtils;

@ConvertApi
@RequiredArgsConstructor
public class ConvertPDFToOffice {

    private final CustomPDFDocumentFactory pdfDocumentFactory;
    private final TempFileManager tempFileManager;
    private final RuntimePathConfig runtimePathConfig;
    private final TabulaTableParser tabulaTableParser;

    @AutoJobPostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            value = "/pdf/presentation",
            resourceWeight = ResourceWeight.LARGE_WEIGHT)
    @Operation(
            summary = "Convert PDF to Presentation format",
            description =
                    "This endpoint converts a given PDF file to a Presentation format. Input:PDF"
                            + " Output:PPT Type:SISO")
    public ResponseEntity<Resource> processPdfToPresentation(
            @ModelAttribute PdfToPresentationRequest request)
            throws IOException, InterruptedException {
        MultipartFile inputFile = request.getFileInput();
        String outputFormat = request.getOutputFormat();
        PDFToFile pdfToFile = new PDFToFile(tempFileManager, runtimePathConfig);
        return pdfToFile.processPdfToOfficeFormat(inputFile, outputFormat, "impress_pdf_import");
    }

    @AutoJobPostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            value = "/pdf/text",
            resourceWeight = ResourceWeight.MEDIUM_WEIGHT)
    @Operation(
            summary = "Convert PDF to Text or RTF format",
            description =
                    "This endpoint converts a given PDF file to Text or RTF format. Input:PDF"
                            + " Output:TXT Type:SISO")
    public ResponseEntity<Resource> processPdfToRTForTXT(
            @ModelAttribute PdfToTextOrRTFRequest request)
            throws IOException, InterruptedException {
        MultipartFile inputFile = request.getFileInput();
        String outputFormat = request.getOutputFormat();
        if ("txt".equals(request.getOutputFormat())) {
            String fileName =
                    GeneralUtils.generateFilename(inputFile.getOriginalFilename(), ".txt");
            TempFile finalOut = tempFileManager.createManagedTempFile(".txt");
            try (PDDocument document = pdfDocumentFactory.load(inputFile)) {
                PDFTextStripper stripper = new PDFTextStripper();
                String text = stripper.getText(document);
                Files.writeString(finalOut.getPath(), text, StandardCharsets.UTF_8);
            } catch (Exception e) {
                finalOut.close();
                throw e;
            }
            return WebResponseUtils.fileToWebResponse(finalOut, fileName, MediaType.TEXT_PLAIN);
        } else {
            PDFToFile pdfToFile = new PDFToFile(tempFileManager, runtimePathConfig);
            return pdfToFile.processPdfToOfficeFormat(inputFile, outputFormat, "writer_pdf_import");
        }
    }

    @AutoJobPostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            value = "/pdf/word",
            resourceWeight = ResourceWeight.LARGE_WEIGHT)
    @Operation(
            summary = "Convert PDF to Word document",
            description =
                    "This endpoint converts a given PDF file to a Word document format. Input:PDF"
                            + " Output:WORD Type:SISO")
    public ResponseEntity<Resource> processPdfToWord(@ModelAttribute PdfToWordRequest request)
            throws IOException, InterruptedException {
        if (request.isEditable() && "docx".equalsIgnoreCase(request.getOutputFormat())) {
            return processPdfToEditableWord(request);
        }
        MultipartFile inputFile = request.getFileInput();
        String outputFormat = request.getOutputFormat();
        PDFToFile pdfToFile = new PDFToFile(tempFileManager, runtimePathConfig);
        return pdfToFile.processPdfToOfficeFormat(inputFile, outputFormat, "writer_pdf_import");
    }

    /**
     * Builds a DOCX with real paragraphs and tables instead of LibreOffice's visual-fidelity import
     * (which places every line in an absolutely-positioned text frame, so the result can't be
     * edited/reflowed like a normal Word document). Pages with a detected table render as a Word
     * table; pages without one render as plain paragraphs.
     */
    private ResponseEntity<Resource> processPdfToEditableWord(PdfToWordRequest request)
            throws IOException {
        String baseName =
                GeneralUtils.removeExtension(request.getFileInput().getOriginalFilename());

        TempFile tempOut = tempFileManager.createManagedTempFile(".docx");
        try (PDDocument document = pdfDocumentFactory.load(request);
                XWPFDocument wordDocument = new XWPFDocument()) {

            int totalPages = document.getNumberOfPages();
            for (int pageNum = 1; pageNum <= totalPages; pageNum++) {
                List<TableFragment> tables = tabulaTableParser.parse(document, pageNum);

                if (tables.isEmpty()) {
                    addPageText(wordDocument, document, pageNum);
                } else {
                    for (TableFragment table : tables) {
                        addTable(wordDocument, table);
                        wordDocument.createParagraph();
                    }
                }

                if (pageNum < totalPages) {
                    wordDocument.createParagraph().createRun().addBreak(BreakType.PAGE);
                }
            }

            try (OutputStream os = Files.newOutputStream(tempOut.getPath())) {
                wordDocument.write(os);
            }
        } catch (Exception e) {
            tempOut.close();
            throw e;
        }

        MediaType mediaType =
                MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        return WebResponseUtils.fileToWebResponse(tempOut, baseName + ".docx", mediaType);
    }

    private void addPageText(XWPFDocument wordDocument, PDDocument document, int pageNum)
            throws IOException {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setStartPage(pageNum);
        stripper.setEndPage(pageNum);
        String text = stripper.getText(document);
        if (text == null || text.isBlank()) {
            return;
        }
        for (String line : text.split("\\r?\\n")) {
            XWPFParagraph paragraph = wordDocument.createParagraph();
            if (!line.isBlank()) {
                paragraph.createRun().setText(line.trim());
            }
        }
    }

    private void addTable(XWPFDocument wordDocument, TableFragment fragment) {
        List<List<String>> rows = fragment.rawRows();
        if (rows.isEmpty()) {
            return;
        }
        int colCount = fragment.columnCount() > 0 ? fragment.columnCount() : rows.get(0).size();
        colCount = Math.max(colCount, 1);

        XWPFTable table = wordDocument.createTable(rows.size(), colCount);
        for (int r = 0; r < rows.size(); r++) {
            List<String> row = rows.get(r);
            XWPFTableRow tableRow = table.getRow(r);
            for (int c = 0; c < colCount; c++) {
                String text = c < row.size() ? row.get(c) : "";
                XWPFTableCell cell = tableRow.getCell(c);
                if (cell == null) {
                    cell = tableRow.createCell();
                }
                cell.setText(text);
            }
        }
    }

    @AutoJobPostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            value = "/pdf/xml",
            resourceWeight = ResourceWeight.LARGE_WEIGHT)
    @Operation(
            summary = "Convert PDF to XML",
            description =
                    "This endpoint converts a PDF file to an XML file. Input:PDF Output:XML"
                            + " Type:SISO")
    public ResponseEntity<Resource> processPdfToXML(@ModelAttribute PDFFile file) throws Exception {
        MultipartFile inputFile = file.getFileInput();

        PDFToFile pdfToFile = new PDFToFile(tempFileManager, runtimePathConfig);
        return pdfToFile.processPdfToOfficeFormat(inputFile, "xml", "writer_pdf_import");
    }
}
