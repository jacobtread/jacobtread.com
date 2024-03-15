import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { useState, type ChangeEvent } from "react";
import { z } from "zod";
import TimesheetPdf from "./TimesheetPdf";

const transformDate = (date: string | null) =>
    date === null ? null : new Date(date);

const baseEntrySchema = z.object({
    name: z.string(),
    startTime: z.string().nullable().transform(transformDate),
    endTime: z.string().nullable().transform(transformDate),
});

export type TimesheetEntry = z.infer<typeof baseEntrySchema> & {
    subEntries: TimesheetEntry[] | null;
};

const entrySchema: z.ZodType<TimesheetEntry> = baseEntrySchema.extend({
    subEntries: z.lazy(() => z.array(entrySchema).nullable()),
}) as z.ZodType<TimesheetEntry>;

const timesheetSchema = z.object({
    entries: z.array(entrySchema),
});

export type TimesheetData = z.infer<typeof timesheetSchema>;

/**
 * This component is responsible for accepting the timesheet data, then
 * allowing the user to view the rendered timesheet as a PDF
 */
export default function Timesheet() {
    const [input, setInput] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [timesheetData, setTimesheetData] = useState<TimesheetData | null>(
        null
    );
    const [error, setError] = useState<string | null>(null);

    const onChangeInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(event.target.value);
    };

    const onChangeInvoiceNumber = (event: ChangeEvent<HTMLInputElement>) => {
        setInvoiceNumber(event.target.value);
    };

    const onGenerate = () => {
        let data: any;
        try {
            data = JSON.parse(input);
        } catch (e) {
            console.error("Failed to parse timesheet", e);
            setError("Failed to parse timesheet, was it valid?");
            return;
        }

        const result = timesheetSchema.safeParse(data);

        if (!result.success) {
            console.log(result.error);
            setError(result.error.toString());
            return;
        }

        setTimesheetData(result.data);
    };

    return (
        <>
            <section className="section">
                <h2 className="section__title">Timesheet Generator</h2>
                <p className="section__text">
                    This tool is used to generate timesheet PDF files from my
                    Obsidian time-keeping data.
                </p>
            </section>

            <div>
                <p className="block__text"></p>

                {error && <p className="error">{error}</p>}

                <div className="input-group">
                    <label htmlFor="invoiceNumber" className="input-label">
                        Invoice Number
                    </label>
                    <input
                        id="invoiceNumber"
                        type="text"
                        value={invoiceNumber}
                        onChange={onChangeInvoiceNumber}
                        className="input"
                    />
                </div>

                <hr />

                <div className="input-group">
                    <label htmlFor="timesheetJSON" className="input-label">
                        Timesheet JSON
                    </label>
                    <textarea
                        name=""
                        id="timesheetJSON"
                        cols={30}
                        rows={10}
                        className="input"
                        onChange={onChangeInput}
                        value={input}
                        style={{ resize: "none" }}></textarea>
                </div>

                <hr />

                <button type="button" className="button" onClick={onGenerate}>
                    Generate
                </button>

                <hr />

                {timesheetData && (
                    <PDFDownloadLink
                        className="button"
                        document={
                            <TimesheetPdf
                                data={timesheetData}
                                invoiceNumber={invoiceNumber}
                            />
                        }
                        fileName={`JacobRead ${invoiceNumber} Timesheet.pdf`}>
                        {({ loading }) =>
                            loading
                                ? "Loading Timesheet..."
                                : "Download Timesheet"
                        }
                    </PDFDownloadLink>
                )}
            </div>
        </>
    );
}
