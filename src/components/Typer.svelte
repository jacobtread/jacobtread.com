<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  export let values: string[];
  export let duration: number;
  let className: string = "";

  let valueIndex: number = 0;
  let deleting: boolean = false;
  let value = "";
  let complete = false;
  let timeout: any;

  const executeUpdate = () => {
    const valueAtIndex: string = values[valueIndex]; // The value that is at the current index
    let delay: number; // The delay before update should be called
    let currentLength: number = value.length;
    if (deleting) {
      currentLength--; // Deleting reduces the length of the value
      if (currentLength == 0) {
        // If we have fully deleted the value
        deleting = false; // The next update should be typing

        // Increase the value index
        if (valueIndex + 1 < values.length) {
          valueIndex++;
        } else {
          valueIndex = 0; // Wrap around to the first value
        }
        delay = 500; // 500ms delay before typing again
      } else {
        delay = 150 - Math.random() * 50;
      }
    } else {
      currentLength++; // Typing increases the length of the value
      if (currentLength == valueAtIndex.length) {
        // If we are at the end of the value
        delay = duration; // Set the delay to the display duration
        deleting = true; // Delete the text on the next update
      } else {
        delay = 300 - Math.random() * 100;
      }
    }
    const newValue = valueAtIndex.substring(0, currentLength);
    value = newValue; // Update the value state
    complete = newValue.length == valueAtIndex.length;
    timeout = setTimeout(executeUpdate, delay);
  };

  onMount(() => {
    executeUpdate();
  });

  onDestroy(() => {
    if (timeout) clearTimeout(timeout);
  });

  export { className as class };
</script>

<span class={className} data-typing={!complete}>
  {value}
</span>

<style>
  /* Before element for displaying the typing cursor */
  .typer[data-typing="true"]::after {
    content: "";
    position: absolute;

    right: -4px;
    top: 0;
    width: 2px;
    height: 100%;

    background: currentColor;
    animation: typer-cursor-blink 1s 1s infinite;
  }

  /* Blinking cursor animation using opacity */
  @keyframes typer-cursor-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
</style>
