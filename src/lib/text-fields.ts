const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'number',
]);

const SKIP_INPUT_TYPES = new Set([
  'hidden',
  'button',
  'submit',
  'reset',
  'checkbox',
  'radio',
  'file',
  'image',
  'range',
  'color',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
]);

function isVisible(element: HTMLElement): boolean {
  if (element.closest('[aria-hidden="true"]')) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0' ||
    Number.parseFloat(style.width) === 0 ||
    Number.parseFloat(style.height) === 0
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width >= 24 && rect.height >= 16;
}

function isPasswordField(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement && element.type === 'password') {
    return true;
  }

  return element.getAttribute('autocomplete') === 'current-password';
}

export function isEligibleTextField(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || element.dataset.aicamouflageIgnore === 'true') {
    return false;
  }

  if (element instanceof HTMLInputElement) {
    if (element.disabled || element.readOnly) {
      return false;
    }

    const type = element.type.toLowerCase();
    if (SKIP_INPUT_TYPES.has(type) || isPasswordField(element)) {
      return false;
    }

    return (TEXT_INPUT_TYPES.has(type) || type === '') && isVisible(element);
  }

  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly && isVisible(element);
  }

  if (element.isContentEditable) {
    const parentEditable = element.parentElement?.closest('[contenteditable="true"]');
    if (parentEditable) {
      return false;
    }

    return isVisible(element);
  }

  if (element.getAttribute('role') === 'textbox') {
    return !isPasswordField(element) && isVisible(element);
  }

  return false;
}

const FIELD_SELECTOR = [
  'input',
  'textarea',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '[role="textbox"]',
].join(',');

export function collectTextFields(root: ParentNode = document): HTMLElement[] {
  const nodes = root.querySelectorAll(FIELD_SELECTOR);
  const fields: HTMLElement[] = [];

  for (const node of nodes) {
    if (isEligibleTextField(node)) {
      fields.push(node);
    }
  }

  return fields;
}
