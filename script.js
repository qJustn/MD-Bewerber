const checkboxes = document.querySelectorAll("input[type='checkbox']");

checkboxes.forEach((checkbox, index) => {
    const savedState = localStorage.getItem("checkbox_" + index);
    if (savedState === "true") {
        checkbox.checked = true;
    }

    checkbox.addEventListener("change", () => {
        localStorage.setItem("checkbox_" + index, checkbox.checked);
    });
});
