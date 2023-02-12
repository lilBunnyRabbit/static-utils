import "../../scripts/init";
import "./index.scss";
import { ThemeState, themeState } from "../../scripts/init";
import { colorInputTemplate } from "../../templates/colorInputTemplate";

const SColors = themeState.attach("colors");
const $inputs = document.getElementById("inputs");

const colorProperties = [
  { key: "background", name: "Background" },
  { key: "background-dark", name: "Dark Background" },
  { key: "text", name: "Text" },
  { key: "primary", name: "Primary" },
  { key: "secondary", name: "Secondary" },
  { key: "error", name: "Error" },
  { key: "success", name: "Success" },
] satisfies Array<{ key: ThemeState.ColorProperties; name: string }>;

const createInputs = (colors: ThemeState.Colors) => {
  $inputs.innerHTML = "";

  colorProperties.map((variable) => {
    const $colorInput = colorInputTemplate.clone();
    const $input = $colorInput.querySelector("input");
    const $label = $colorInput.querySelector("label");

    const property = `--${variable.key}`;

    const color = colors[variable.key] || getComputedStyle(document.documentElement).getPropertyValue(property);

    $input.id = `i-${variable.key}`;
    $input.value = color.trim();

    $input.addEventListener("input", (e) => {
      document.documentElement.style.setProperty(property, (e.target as HTMLInputElement).value);
    });

    $input.addEventListener("change", (e) => {
      SColors.set({ ...SColors.get(), [variable.key]: (e.target as HTMLInputElement).value });
    });

    $label.setAttribute("for", $input.id);
    $label.innerText = variable.name;

    $inputs.appendChild($colorInput);
  });
};

createInputs(SColors.get());

document.getElementById("b-reset").addEventListener("click", () => {
  SColors.reset();
  createInputs(SColors.get());
});
