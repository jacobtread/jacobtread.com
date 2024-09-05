import fs from "fs";
import path from "path";

/**
 * Finds all markdown files within the provided
 * directory
 *
 * @param {string} directory The directory to search within
 * @returns All markdown files in the directory
 */
function readMarkdownFiles(directory) {
    return fs.readdirSync(directory).filter((file) => file.endsWith(".md"));
}

/**
 * Reads the provided markdown file and updates the
 * "priority: {NUMBER}" line within the file to match
 * the provided priority
 *
 * @param {string} filePath The path to the markdown file
 * @param {number} newPriority The new priority to use
 */
function updatePriorityLine(filePath, newPriority) {
    let content = fs.readFileSync(filePath, "utf8");
    content = content.replace(/priority: \d+/, `priority: ${newPriority}`);
    fs.writeFileSync(filePath, content);
}

/**
 * Inserts a new markdown file at the provided priority order.
 * Will move any existing markdown files that are after or
 * conflicting with the priority requested
 *
 * @param {string} directory Base directory to work within
 * @param {number} order Priority to give the file
 * @param {string} name Name for the new file
 */
function insertFileAtOrder(directory, order, name) {
    const files = readMarkdownFiles(directory);

    // Rename existing files
    files.forEach((file) => {
        const dashIndex = file.indexOf("-");
        const existingOrder = file.slice(0, dashIndex);
        const existingName = file.slice(dashIndex + 1);

        if (parseInt(existingOrder) >= order) {
            const newOrder = parseInt(existingOrder) + 1;
            const newName = `${newOrder}-${existingName.replaceAll(".md", "")}.md`;
            fs.renameSync(
                path.join(directory, file),
                path.join(directory, newName)
            );

            // Update priority line in renamed file
            updatePriorityLine(path.join(directory, newName), newOrder);
        }
    });

    // Write new file
    const newFileName = `${order}-${name.replaceAll(".md", "")}.md`;
    fs.writeFileSync(path.join(directory, newFileName), "");

    console.log(`Inserted file ${newFileName} at order ${order}`);
}

// Extract command line arguments
const args = process.argv.slice(2);

// Ensure correct usage
if (args.length !== 2) {
    console.error("Usage: node insertProject.mjs <order> <name>");
    process.exit(1);
}

// Extract arguments
const directory = "./src/content/projects";
const orderToInsert = parseInt(args[0]);
const nameToInsert = args[1];

// Validate orderToInsert
if (isNaN(orderToInsert) || orderToInsert <= 0) {
    console.error("Invalid order number. Order must be a positive integer.");
    process.exit(1);
}

// Insert file at specified order
insertFileAtOrder(directory, orderToInsert, nameToInsert);
