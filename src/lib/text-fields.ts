import { DEBUG, debug, debugVerbose } from './debug';

const TEXT_INPUT_TYPES = new Set([
  'text',
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
  'search',
  'email',
  'url',
  'tel',
  'number',
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

function hasText(value: string | null): boolean {
  return Boolean(value?.trim());
}

const AI_INPUT_HINT = /(?:message|prompt|ask|chat|generate|question|reply|response)/i;

function hasAiInputHint(element: HTMLElement): boolean {
  const attributes = [
    element.getAttribute('aria-label'),
    element.getAttribute('placeholder'),
    element.getAttribute('data-placeholder'),
    element.getAttribute('name'),
    element.getAttribute('id'),
    String(element.className),
  ];

  if (attributes.some((value) => typeof value === 'string' && AI_INPUT_HINT.test(value))) {
    return true;
  }

  const label = element.id
    ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent
    : element.closest('label')?.textContent;
  if (label && AI_INPUT_HINT.test(label)) {
    return true;
  }

  return false;
}

type FieldEligibility =
  | { eligible: true; element: HTMLElement }
  | { eligible: false; reason: string };

function getFieldEligibility(element: Element): FieldEligibility {
  if (!(element instanceof HTMLElement)) {
    return { eligible: false, reason: 'not-html' };
  }

  if (element.dataset.aicamouflageIgnore === 'true') {
    return { eligible: false, reason: 'ignored' };
  }

  if (element instanceof HTMLInputElement) {
    if (element.disabled) {
      return { eligible: false, reason: 'disabled' };
    }

    if (element.readOnly) {
      return { eligible: false, reason: 'readonly' };
    }

    const type = element.type.toLowerCase();
    if (SKIP_INPUT_TYPES.has(type)) {
      return { eligible: false, reason: `skip-type:${type}` };
    }

    if (isPasswordField(element)) {
      return { eligible: false, reason: 'password' };
    }

    if (!(TEXT_INPUT_TYPES.has(type) || type === '')) {
      return { eligible: false, reason: `not-text-type:${type}` };
    }

    if (!hasText(element.value)) {
      return { eligible: false, reason: 'empty' };
    }

    if (!hasAiInputHint(element)) {
      return { eligible: false, reason: 'no-ai-hint' };
    }

    if (!isVisible(element)) {
      return { eligible: false, reason: 'not-visible' };
    }

    return { eligible: true, element };
  }

  if (element instanceof HTMLTextAreaElement) {
    if (element.disabled) {
      return { eligible: false, reason: 'disabled' };
    }

    if (element.readOnly) {
      return { eligible: false, reason: 'readonly' };
    }

    if (!hasText(element.value)) {
      return { eligible: false, reason: 'empty' };
    }

    if (!hasAiInputHint(element)) {
      return { eligible: false, reason: 'no-ai-hint' };
    }

    if (!isVisible(element)) {
      return { eligible: false, reason: 'not-visible' };
    }

    return { eligible: true, element };
  }

  if (element.isContentEditable) {
    const parentEditable = element.parentElement?.closest('[contenteditable="true"]');
    if (parentEditable) {
      return { eligible: false, reason: 'nested-contenteditable' };
    }

    if (!hasText(element.textContent)) {
      return { eligible: false, reason: 'empty' };
    }

    if (!hasAiInputHint(element)) {
      return { eligible: false, reason: 'no-ai-hint' };
    }

    if (!isVisible(element)) {
      return { eligible: false, reason: 'not-visible' };
    }

    return { eligible: true, element };
  }

  if (element.getAttribute('role') === 'textbox') {
    if (isPasswordField(element)) {
      return { eligible: false, reason: 'password' };
    }

    if (!hasText(element.textContent)) {
      return { eligible: false, reason: 'empty' };
    }

    if (!hasAiInputHint(element)) {
      return { eligible: false, reason: 'no-ai-hint' };
    }

    if (!isVisible(element)) {
      return { eligible: false, reason: 'not-visible' };
    }

    return { eligible: true, element };
  }

  return { eligible: false, reason: 'not-field' };
}

function describeField(element: Element): string {
  if (!(element instanceof HTMLElement)) {
    return element.nodeName.toLowerCase();
  }

  const name = element.getAttribute('name');
  return [
    element.tagName.toLowerCase(),
    element.id ? `#${element.id}` : '',
    name ? `[name=${name}]` : '',
  ].join('');
}

export function isEligibleTextField(element: Element): element is HTMLElement {
  return getFieldEligibility(element).eligible;
}

const FIELD_SELECTOR = [
  'input',
  'textarea',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '[role="textbox"]',
].join(',');

let lastCollectSummary = '';

export function collectTextFields(root: ParentNode = document): HTMLElement[] {
  const nodes = root.querySelectorAll(FIELD_SELECTOR);
  const fields: HTMLElement[] = [];
  const skipped: Record<string, number> = {};

  for (const node of nodes) {
    const result = getFieldEligibility(node);
    if (result.eligible) {
      fields.push(result.element);
      continue;
    }

    if (DEBUG) {
      skipped[result.reason] = (skipped[result.reason] ?? 0) + 1;
      debugVerbose('field skipped', describeField(node), result.reason);
    }
  }

  if (DEBUG) {
    const summary = JSON.stringify({
      queried: nodes.length,
      eligible: fields.length,
      skipped,
    });
    if (summary !== lastCollectSummary) {
      lastCollectSummary = summary;
      debug('collectTextFields', {
        queried: nodes.length,
        eligible: fields.length,
        skipped,
      });
    }
  }

  return fields;
}
