(() => {
  "use strict";

  const MAX_DIGITS = 12;
  const OPERATOR_SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  const currentDisplay = document.getElementById("current-display");
  const previousDisplay = document.getElementById("previous-display");
  const keypad = document.getElementById("keypad");
  const operatorButtons = Array.from(document.querySelectorAll(".key--operator"));

  const state = {
    currentInput: "0",
    previousValue: null,
    operator: null,
    previousText: "",
    lastCalculation: null,
    justEvaluated: false,
    operandStarted: false,
    hasError: false,
  };

  const keyMap = new Map([
    ..."0123456789".split("").map((digit) => [digit, `[data-action="digit"][data-value="${digit}"]`]),
    ["+", '[data-action="operator"][data-value="+"]'],
    ["-", '[data-action="operator"][data-value="-"]'],
    ["*", '[data-action="operator"][data-value="*"]'],
    ["x", '[data-action="operator"][data-value="*"]'],
    ["X", '[data-action="operator"][data-value="*"]'],
    ["×", '[data-action="operator"][data-value="*"]'],
    ["/", '[data-action="operator"][data-value="/"]'],
    ["÷", '[data-action="operator"][data-value="/"]'],
    ["%", '[data-action="percent"]'],
    ["Enter", '[data-action="equals"]'],
    ["=", '[data-action="equals"]'],
    ["Backspace", '[data-action="delete"]'],
    ["Delete", '[data-action="delete"]'],
    ["Escape", '[data-action="clear"]'],
    ["c", '[data-action="clear"]'],
    ["C", '[data-action="clear"]'],
    ["n", '[data-action="sign"]'],
    ["N", '[data-action="sign"]'],
    ["F9", '[data-action="sign"]'],
  ]);

  function countDigits(value) {
    return (String(value).match(/\d/g) || []).length;
  }

  function cleanNumber(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    if (Object.is(value, -0)) value = 0;
    return Number(value.toPrecision(12));
  }

  function formatNumber(value) {
    const cleaned = cleanNumber(value);
    if (cleaned === null) return "Error";

    const text = String(cleaned);
    if (text.length > 16) {
      return cleaned.toExponential(6).replace(/\.?0+e/, "e");
    }
    return text;
  }

  function resetState() {
    state.currentInput = "0";
    state.previousValue = null;
    state.operator = null;
    state.previousText = "";
    state.lastCalculation = null;
    state.justEvaluated = false;
    state.operandStarted = false;
    state.hasError = false;
  }

  function resetForNewEntry() {
    state.currentInput = "0";
    state.previousValue = null;
    state.operator = null;
    state.previousText = "";
    state.lastCalculation = null;
    state.justEvaluated = false;
    state.operandStarted = false;
  }

  function showError(message) {
    state.currentInput = message;
    state.previousText = "Error";
    state.previousValue = null;
    state.operator = null;
    state.lastCalculation = null;
    state.justEvaluated = false;
    state.operandStarted = false;
    state.hasError = true;
  }

  function calculate(left, right, operator) {
    switch (operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return right === 0 ? null : left / right;
      default:
        return null;
    }
  }

  function setCurrentResult(value) {
    const cleaned = cleanNumber(value);
    if (cleaned === null) {
      showError("Invalid calculation");
      return false;
    }
    state.currentInput = String(cleaned);
    return true;
  }

  function inputDigit(digit) {
    if (state.justEvaluated) resetForNewEntry();
    if (countDigits(state.currentInput) >= MAX_DIGITS) return;

    if (state.currentInput === "0") {
      state.currentInput = digit;
    } else if (state.currentInput === "-0") {
      state.currentInput = "-" + digit;
    } else {
      state.currentInput += digit;
    }

    state.operandStarted = true;
  }

  function inputDecimal() {
    if (state.justEvaluated) resetForNewEntry();
    if (state.currentInput.includes(".")) return;

    state.currentInput += ".";
    state.operandStarted = true;
  }

  function chooseOperator(operator) {
    if (state.operator && state.previousValue !== null) {
      if (!state.operandStarted) {
        state.operator = operator;
        state.previousText = `${formatNumber(state.previousValue)} ${OPERATOR_SYMBOLS[operator]}`;
        return;
      }

      const operand = Number(state.currentInput);
      const result = calculate(state.previousValue, operand, state.operator);
      if (result === null) {
        showError("Cannot divide by 0");
        return;
      }

      const cleaned = cleanNumber(result);
      if (cleaned === null) {
        showError("Invalid calculation");
        return;
      }
      state.previousValue = cleaned;
    } else {
      state.previousValue = Number(state.currentInput);
    }

    state.operator = operator;
    state.previousText = `${formatNumber(state.previousValue)} ${OPERATOR_SYMBOLS[operator]}`;
    state.currentInput = "0";
    state.lastCalculation = null;
    state.justEvaluated = false;
    state.operandStarted = false;
  }

  function equals() {
    if (state.operator && state.previousValue !== null) {
      const left = state.previousValue;
      const operand = Number(state.currentInput);
      const operator = state.operator;
      const result = calculate(left, operand, operator);

      if (result === null) {
        showError("Cannot divide by 0");
        return;
      }

      const cleaned = cleanNumber(result);
      if (cleaned === null) {
        showError("Invalid calculation");
        return;
      }

      state.previousText = `${formatNumber(left)} ${OPERATOR_SYMBOLS[operator]} ${formatNumber(operand)} =`;
      state.currentInput = String(cleaned);
      state.lastCalculation = { operator, operand };
      state.previousValue = null;
      state.operator = null;
      state.justEvaluated = true;
      state.operandStarted = false;
      return;
    }

    if (state.justEvaluated && state.lastCalculation) {
      const { operator, operand } = state.lastCalculation;
      const left = Number(state.currentInput);
      const result = calculate(left, operand, operator);

      if (result === null) {
        showError("Cannot divide by 0");
        return;
      }

      const cleaned = cleanNumber(result);
      if (cleaned === null) {
        showError("Invalid calculation");
        return;
      }

      state.previousText = `${formatNumber(left)} ${OPERATOR_SYMBOLS[operator]} ${formatNumber(operand)} =`;
      state.currentInput = String(cleaned);
      state.justEvaluated = true;
      state.operandStarted = false;
    }
  }

  function applyPercent() {
    const current = Number(state.currentInput);

    if (state.operator && state.previousValue !== null) {
      const operator = state.operator;
      const isRelative = operator === "+" || operator === "-";
      const result = isRelative ? (state.previousValue * current) / 100 : current / 100;

      if (!setCurrentResult(result)) return;

      state.previousText = `${formatNumber(state.previousValue)} ${OPERATOR_SYMBOLS[operator]} ${formatNumber(current)} %`;
      state.operandStarted = true;
      return;
    }

    if (!setCurrentResult(current / 100)) return;
    state.previousText = `${formatNumber(current)} % =`;
    state.lastCalculation = null;
    state.justEvaluated = false;
    state.operandStarted = true;
  }

  function toggleSign() {
    if (state.currentInput.startsWith("-")) {
      state.currentInput = state.currentInput.slice(1) || "0";
    } else {
      state.currentInput = "-" + state.currentInput;
    }

    if (state.justEvaluated) {
      state.lastCalculation = null;
      state.justEvaluated = false;
    }
    state.operandStarted = true;
  }

  function deleteLastDigit() {
    if (state.justEvaluated) {
      state.lastCalculation = null;
      state.justEvaluated = false;
    }

    let text = state.currentInput;
    if (text.length <= 1 || text === "-0") {
      text = "0";
    } else {
      text = text.slice(0, -1);
      if (text === "" || text === "-" || text === "." || text === "-.") {
        text = "0";
      }
    }

    state.currentInput = text;
    state.operandStarted = true;
  }

  function updateDisplay() {
    currentDisplay.textContent = state.currentInput;
    const length = state.currentInput.length;
    currentDisplay.dataset.length = length > 13 ? "x-long" : length > 9 ? "long" : "normal";

    previousDisplay.textContent = state.previousText || "\u00A0";

    operatorButtons.forEach((button) => {
      const selected = state.operator === button.dataset.value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function handleAction(action, value) {
    if (state.hasError) resetState();

    switch (action) {
      case "digit":
        inputDigit(value);
        break;
      case "decimal":
        inputDecimal();
        break;
      case "operator":
        chooseOperator(value);
        break;
      case "equals":
        equals();
        break;
      case "percent":
        applyPercent();
        break;
      case "sign":
        toggleSign();
        break;
      case "delete":
        deleteLastDigit();
        break;
      case "clear":
        resetState();
        break;
      default:
        break;
    }

    updateDisplay();
  }

  keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !keypad.contains(button)) return;
    handleAction(button.dataset.action, button.dataset.value);
  });

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const target = event.target;
    if (target instanceof HTMLElement) {
      if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    }

    const selector = keyMap.get(event.key);
    if (!selector) return;

    event.preventDefault();
    const button = keypad.querySelector(selector);
    if (!button) return;

    button.classList.add("is-pressed");
    handleAction(button.dataset.action, button.dataset.value);
  });

  document.addEventListener("keyup", () => {
    keypad.querySelectorAll(".is-pressed").forEach((button) => button.classList.remove("is-pressed"));
  });

  window.addEventListener("blur", () => {
    keypad.querySelectorAll(".is-pressed").forEach((button) => button.classList.remove("is-pressed"));
  });

  updateDisplay();
})();
