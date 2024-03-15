import { Fragment } from "react";
import type { TimesheetData, TimesheetEntry } from "./Timesheet";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import moment from "moment";

type Props = {
    data: TimesheetData;
    invoiceNumber: string;
};

const styles = StyleSheet.create({
    tableContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        borderWidth: 1,
        borderColor: "#ececec",
    },

    tableRow: {
        flexDirection: "row",
        borderBottomColor: "#ececec",
        borderBottomWidth: 1,
        alignItems: "center",
        height: 24,
        fontStyle: "bold",
        fontSize: 8,
        width: "100%",
    },

    tableRowWrapper: {
        borderColor: "#f9f9f9",
        borderWidth: 5,
    },

    tableRowHeader: {
        fontFamily: "Helvetica-Bold",
        backgroundColor: "#ececec",
    },
    tableCell: {
        padding: 15,
    },

    tableCellBlock: {
        width: "100%",
    },
    tableCellTime: {
        width: "200px",
        textAlign: "right",
    },

    tableCellDuration: {
        width: "400px",
        textAlign: "right",
        fontWeight: "bold",
    },

    tableIndent: {
        borderLeftWidth: 5,
        borderLeftColor: "#999",
    },

    page: {
        padding: 15,
    },

    title: {
        fontFamily: "Helvetica-Bold",
        fontWeight: "bold",
        fontSize: 12,
        marginBottom: 5,
    },

    heading: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
    },

    headingRight: {
        textAlign: "right",
        alignItems: "flex-end",
    },

    details: {
        gap: 4,
        marginBottom: 5,
    },

    detailsFieldName: {
        fontFamily: "Helvetica-Bold",
        fontWeight: "bold",
        fontSize: 8,
        marginBottom: 5,
    },

    detailsField: {
        fontSize: 8,
        marginBottom: 5,
    },
});

function formatDateTime(value: Date): string {
    return moment(value).format("DD/MM/YYYY HH:mm");
}

function formatDate(value: Date): string {
    return moment(value).format("DD/MM/YYYY");
}

function getEntryDuration(entry: TimesheetEntry): number {
    // Entry must have no children if it has both ends
    if (entry.startTime !== null && entry.endTime !== null) {
        return moment(entry.endTime).diff(moment(entry.startTime));
    }

    // Entry has children, must sum the children
    if (entry.subEntries !== null && entry.subEntries.length > 0) {
        return getTotalDuration(entry.subEntries);
    }

    return 0;
}

function formatDuration(totalTime: number): string {
    let output = "";
    let duration = moment.duration(totalTime);
    let hours = Math.floor(duration.asHours());

    if (hours > 0) output += hours + "h ";
    if (duration.minutes() > 0) output += duration.minutes() + "m ";
    output += duration.seconds() + "s";

    return output;
}

function getTotalDuration(entries: TimesheetEntry[]): number {
    const totalDuration = entries
        .map(getEntryDuration)
        .reduce((prev, curr) => prev + curr);

    return totalDuration;
}

function TimesheetEntry({ entry }: { entry: TimesheetEntry }) {
    const duration = getEntryDuration(entry);

    return (
        <Fragment>
            <View style={styles.tableRow} wrap={false}>
                <Text style={[styles.tableCell, styles.tableCellBlock]}>
                    {entry.name}
                </Text>

                {entry.startTime !== null && entry.endTime !== null && (
                    <>
                        <Text style={[styles.tableCell, styles.tableCellTime]}>
                            {entry.startTime
                                ? formatDateTime(entry.startTime)
                                : ""}
                        </Text>
                        <Text style={[styles.tableCell, styles.tableCellTime]}>
                            {entry.endTime ? formatDateTime(entry.endTime) : ""}
                        </Text>
                    </>
                )}
                <Text style={[styles.tableCell, styles.tableCellTime]}>
                    {formatDuration(duration)}
                </Text>
            </View>

            {entry.subEntries != null && (
                <View style={[styles.tableIndent, styles.tableRowWrapper]}>
                    {entry.subEntries.map((entry, index) => (
                        <TimesheetEntry entry={entry} key={index} />
                    ))}
                </View>
            )}
        </Fragment>
    );
}

export default function TimesheetPdf({ data, invoiceNumber }: Props) {
    const duration = getTotalDuration(data.entries);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.heading}>
                    <Text style={styles.title}>Jacob Read</Text>
                    <Text style={styles.title}>Timesheet</Text>
                </View>

                <View style={styles.details}>
                    <Text style={styles.detailsField}>
                        <Text style={styles.detailsFieldName}>Date:</Text>{" "}
                        {formatDate(new Date())}
                    </Text>
                    <Text style={styles.detailsField}>
                        <Text style={styles.detailsFieldName}>Invoice #:</Text>{" "}
                        {invoiceNumber}
                    </Text>

                    <Text style={styles.detailsField}>
                        <Text style={styles.detailsFieldName}>
                            Total Duration:
                        </Text>{" "}
                        {formatDuration(duration)}
                    </Text>
                </View>
                <View style={styles.tableContainer}>
                    {/* Table Header */}
                    <View style={[styles.tableRow, styles.tableRowHeader]}>
                        <Text style={[styles.tableCell, styles.tableCellBlock]}>
                            Block Name
                        </Text>
                        <Text style={[styles.tableCell, styles.tableCellTime]}>
                            Start Time
                        </Text>
                        <Text style={[styles.tableCell, styles.tableCellTime]}>
                            End Time
                        </Text>{" "}
                        <Text style={[styles.tableCell, styles.tableCellTime]}>
                            Duration
                        </Text>
                    </View>
                    {/* Table Data */}
                    {data.entries.map((entry, index) => (
                        <TimesheetEntry entry={entry} key={index} />
                    ))}

                    <View style={[styles.tableRow, styles.tableRowHeader]}>
                        <Text style={[styles.tableCell, styles.tableCellBlock]}>
                            Total
                        </Text>

                        <Text
                            style={[styles.tableCell, styles.tableCellTime]}
                        />
                        <Text
                            style={[styles.tableCell, styles.tableCellTime]}
                        />

                        <Text
                            style={[
                                styles.tableCell,
                                styles.tableCellDuration,
                            ]}>
                            {formatDuration(duration)}
                        </Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
}
