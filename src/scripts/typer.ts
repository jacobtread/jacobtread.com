// The time to leave a text before deleting it
const DISPLAY_DURATION: number = 1000;
// The time to leave the next blank before typing a new text
const PRE_DISPLAY_DURATION: number = 500;

/**
 * Creates a new typer from the provided html element
 *
 * @param element The element to create the typer from
 */
function createTyper(element: HTMLElement): void {
    const valuesAttribute = element.getAttribute("data-values");

    // Ensure the value attributes are present
    if (valuesAttribute == null) return;

    const values: string[] = valuesAttribute.split(",");

    // Ensure there is values to cycle between
    if (values.length == 0) return;

    let valueIndex: number = 0;

    function updateDeleting() {
        const value = element.innerText;
        const length = value.length - 1;
        const complete = length == 0;

        // Asssign the new value
        element.innerText = value.substring(0, length);
        // Set the typing state attribute
        element.setAttribute("data-typing", (!complete).toString());

        if (complete) {
            // Switch to the next value
            valueIndex = (valueIndex + 1) % values.length;

            // The next update is a typing update
            setTimeout(updateTyping, PRE_DISPLAY_DURATION);
        } else {
            // Continue delete updates until the value is complete
            setTimeout(updateDeleting, 150 - Math.random() * 50);
        }
    }

    function updateTyping() {
        const value = values[valueIndex];
        const length = element.innerText.length + 1;
        const complete = length == value.length;

        // Asssign the new value
        element.innerText = value.substring(0, length);
        // Set the typing state attribute
        element.setAttribute("data-typing", (!complete).toString());

        if (complete) {
            // The next update is a deleting update
            setTimeout(updateDeleting, DISPLAY_DURATION);
        } else {
            // Continue typing updates until the value is complete
            setTimeout(updateTyping, 300 - Math.random() * 100);
        }
    }

    // Clear the element text before starting
    element.innerText = "";

    // Execute the first update
    updateTyping();
}

// Load the typer elements when the window loads
window.onload = () => {
    const typers = document.querySelectorAll(".typer");
    typers.forEach((typer) => createTyper(typer as HTMLElement));
};
