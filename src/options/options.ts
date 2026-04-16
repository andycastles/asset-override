import type { Config, Group, RedirectRule } from "../shared/types";
import { getConfig, setConfig } from "../shared/storage";

// ── Utilities ──────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function newGroup(): Group {
  return {
    id: uid(),
    name: "New Group",
    enabled: true,
    tabUrlPattern: "",
    defaultRedirectOriginDestination: "",
    rules: [],
  };
}

function newRule(): RedirectRule {
  return { id: uid(), type: "redirect_origin", urlPattern: "", exceptions: [] };
}

// ── State ──────────────────────────────────────────────────────────────

let config: Config = { groups: [] };

// ── Debounced save ─────────────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const saveIndicator = document.createElement("p");
saveIndicator.className = "save-indicator";
document.querySelector(".main")?.prepend(saveIndicator);

function scheduleSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await setConfig(config);
    saveIndicator.textContent = "✓ Saved";
    saveIndicator.classList.add("save-indicator--saved");
    setTimeout(() => {
      saveIndicator.textContent = "";
      saveIndicator.classList.remove("save-indicator--saved");
    }, 2000);
  }, 400);
}

// ── Rendering ──────────────────────────────────────────────────────────

function renderAll(): void {
  const list = document.getElementById("groups-list") as HTMLDivElement;
  const empty = document.getElementById("empty-state") as HTMLParagraphElement;

  list.innerHTML = "";

  if (config.groups.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const group of config.groups) {
    list.appendChild(renderGroup(group));
  }
}

function renderGroup(group: Group): HTMLElement {
  const card = document.createElement("div");
  card.className = `group-card${group.enabled ? "" : " group-card--disabled"}`;
  card.dataset.groupId = group.id;

  // ── Header ──
  const header = document.createElement("div");
  header.className = "group-header";

  const toggle = document.createElement("label");
  toggle.className = "toggle";
  toggle.title = group.enabled ? "Disable group" : "Enable group";
  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  toggleInput.className = "toggle__input";
  toggleInput.checked = group.enabled;
  toggleInput.addEventListener("change", () => {
    group.enabled = toggleInput.checked;
    card.classList.toggle("group-card--disabled", !group.enabled);
    toggle.title = group.enabled ? "Disable group" : "Enable group";
    scheduleSave();
  });
  const toggleTrack = document.createElement("span");
  toggleTrack.className = "toggle__track";
  toggle.appendChild(toggleInput);
  toggle.appendChild(toggleTrack);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "group-header__name";
  nameInput.value = group.name;
  nameInput.placeholder = "Group name";
  nameInput.addEventListener("input", () => {
    group.name = nameInput.value;
    scheduleSave();
  });

  const actions = document.createElement("div");
  actions.className = "group-header__actions";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn--danger";
  deleteBtn.textContent = "Delete group";
  deleteBtn.addEventListener("click", () => {
    config.groups = config.groups.filter((g) => g.id !== group.id);
    renderAll();
    scheduleSave();
  });

  actions.appendChild(deleteBtn);
  header.appendChild(toggle);
  header.appendChild(nameInput);
  header.appendChild(actions);

  // ── Body ──
  const body = document.createElement("div");
  body.className = "group-body";

  body.appendChild(
    buildField(
      "Tab URL Pattern (optional)",
      "tabUrlPattern",
      group.tabUrlPattern ?? "",
      "e.g. https://staging.example.com/*",
      "Only apply rules when the current tab's URL matches this pattern. Leave blank to apply on all pages.",
      (val) => {
        group.tabUrlPattern = val;
        scheduleSave();
      }
    )
  );

  body.appendChild(
    buildField(
      "Default redirect origin destination",
      "defaultRedirectOriginDestination",
      group.defaultRedirectOriginDestination,
      "e.g. http://localhost:3000",
      "Protocol, hostname and optional port to redirect matching asset requests to.",
      (val) => {
        group.defaultRedirectOriginDestination = val;
        scheduleSave();
      }
    )
  );

  // Rules section
  const rulesSection = document.createElement("div");

  const rulesHeader = document.createElement("div");
  rulesHeader.className = "rules-section__header";
  const rulesTitle = document.createElement("span");
  rulesTitle.className = "rules-section__title";
  rulesTitle.textContent = "Redirect Rules";
  const addRuleBtn = document.createElement("button");
  addRuleBtn.className = "btn btn--secondary";
  addRuleBtn.textContent = "+ Add Rule";
  addRuleBtn.addEventListener("click", () => {
    group.rules.push(newRule());
    refreshRulesList(group, rulesList);
    scheduleSave();
  });
  rulesHeader.appendChild(rulesTitle);
  rulesHeader.appendChild(addRuleBtn);

  const rulesList = document.createElement("div");
  rulesList.className = "rules-list";
  refreshRulesList(group, rulesList);

  rulesSection.appendChild(rulesHeader);
  rulesSection.appendChild(rulesList);
  body.appendChild(rulesSection);

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

function refreshRulesList(group: Group, container: HTMLElement): void {
  container.innerHTML = "";
  if (group.rules.length === 0) {
    const empty = document.createElement("p");
    empty.className = "rules-empty";
    empty.textContent = "No rules yet.";
    container.appendChild(empty);
    return;
  }
  for (const rule of group.rules) {
    container.appendChild(renderRule(group, rule, container));
  }
}

function renderRule(
  group: Group,
  rule: RedirectRule,
  container: HTMLElement
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "rule-wrapper";

  // ── Main rule row ──
  const row = document.createElement("div");
  row.className = "rule-row";

  const typeLabel = document.createElement("span");
  typeLabel.className = "rule-row__type";
  typeLabel.textContent = "Redirect origin";

  const patternInput = document.createElement("input");
  patternInput.type = "text";
  patternInput.className = "rule-row__pattern";
  patternInput.value = rule.urlPattern;
  patternInput.placeholder = "e.g. https://cdn.example.com/assets/*";
  patternInput.addEventListener("input", () => {
    rule.urlPattern = patternInput.value;
    scheduleSave();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn--icon";
  deleteBtn.title = "Remove rule";
  deleteBtn.textContent = "✕";
  deleteBtn.addEventListener("click", () => {
    group.rules = group.rules.filter((r) => r.id !== rule.id);
    refreshRulesList(group, container);
    scheduleSave();
  });

  row.appendChild(typeLabel);
  row.appendChild(patternInput);
  row.appendChild(deleteBtn);

  // ── Exceptions ──
  const exceptionsSection = document.createElement("div");
  exceptionsSection.className = "exceptions-section";

  const exceptionsHeader = document.createElement("div");
  exceptionsHeader.className = "exceptions-header";

  const exceptionsLabel = document.createElement("span");
  exceptionsLabel.className = "exceptions-label";
  exceptionsLabel.textContent = "Exceptions";

  const addExceptionBtn = document.createElement("button");
  addExceptionBtn.className = "btn btn--icon btn--add-exception";
  addExceptionBtn.title = "Add exception pattern";
  addExceptionBtn.textContent = "+ exception";
  addExceptionBtn.addEventListener("click", () => {
    rule.exceptions.push("");
    refreshExceptions(rule, exceptionsList);
    scheduleSave();
  });

  exceptionsHeader.appendChild(exceptionsLabel);
  exceptionsHeader.appendChild(addExceptionBtn);

  const exceptionsList = document.createElement("div");
  exceptionsList.className = "exceptions-list";
  refreshExceptions(rule, exceptionsList);

  exceptionsSection.appendChild(exceptionsHeader);
  exceptionsSection.appendChild(exceptionsList);

  wrapper.appendChild(row);
  wrapper.appendChild(exceptionsSection);
  return wrapper;
}

function refreshExceptions(rule: RedirectRule, container: HTMLElement): void {
  container.innerHTML = "";
  rule.exceptions.forEach((exc, idx) => {
    const row = document.createElement("div");
    row.className = "exception-row";

    const icon = document.createElement("span");
    icon.className = "exception-row__icon";
    icon.textContent = "↳";
    icon.title = "Exception — this pattern will NOT be redirected";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "rule-row__pattern exception-row__pattern";
    input.value = exc;
    input.placeholder = "e.g. https://cdn.example.com/assets/vendor/*";
    input.addEventListener("input", () => {
      rule.exceptions[idx] = input.value;
      scheduleSave();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn--icon";
    removeBtn.title = "Remove exception";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      rule.exceptions.splice(idx, 1);
      refreshExceptions(rule, container);
      scheduleSave();
    });

    row.appendChild(icon);
    row.appendChild(input);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });
}

function buildField(
  label: string,
  _name: string,
  value: string,
  placeholder: string,
  hint: string,
  onChange: (val: string) => void
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const lbl = document.createElement("label");
  lbl.className = "field__label";
  lbl.textContent = label;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "field__input";
  input.value = value;
  input.placeholder = placeholder;
  input.addEventListener("input", () => onChange(input.value));

  const hintEl = document.createElement("p");
  hintEl.className = "field__hint";
  hintEl.textContent = hint;

  wrapper.appendChild(lbl);
  wrapper.appendChild(input);
  wrapper.appendChild(hintEl);
  return wrapper;
}

// ── Bootstrap ──────────────────────────────────────────────────────────

async function init(): Promise<void> {
  config = await getConfig();
  renderAll();

  document.getElementById("btn-add-group")?.addEventListener("click", () => {
    config.groups.push(newGroup());
    renderAll();
    scheduleSave();
  });
}

init().catch(console.error);
