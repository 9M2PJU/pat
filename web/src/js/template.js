import * as bootstrap from 'bootstrap';
import _ from 'lodash';

// Template state management
class TemplateNode {
  constructor(name, type, description = '') {
    this.name = name;
    this.type = type;
    this.description = description;
    this.value = '';
    this.parents = new Set();
    this.children = new Set();
    this.options = [];
  }
}

class TemplateState {
  constructor() {
    this.nodes = new Map();
    this.domElements = new Map();
    this.templateName = '';
    this.prompts = new Map();
  }

  getPrompt(name) {
    return this.prompts.get(name);
  }

  setPrompt(name, originalTag) {
    this.prompts.set(name, originalTag);
  }

  collectFormData() {
    const formData = {
      responses: {}
    };

    document.querySelectorAll('input[data-original-tag], textarea[data-original-tag], select[data-original-tag]').forEach(el => {
      const originalTag = el.dataset.originalTag;
      const value = el.value;

      if (originalTag && value) {
        formData.responses[originalTag] = value;
      }
    });

    return formData;
  }

  getLatestValue(nodeName) {
    const varInput = document.querySelector(`input[data-var="${nodeName}"]`);
    if (varInput) {
      return varInput.value;
    }

    const nodeInput = document.querySelector(`[data-node="${nodeName}"]`);
    if (nodeInput) {
      return nodeInput.value;
    }

    const node = this.getNode(nodeName);
    return node ? node.value : '';
  }

  addNode(node) {
    this.nodes.set(node.name, node);
  }

  getNode(name) {
    return this.nodes.get(name);
  }

  updateValue(name, value) {
    const node = this.getNode(name);
    if (node) {
      node.value = value;
      this.updateDependents(node);
    }
  }

  updateDependents(node) {
    node.children.forEach(childName => {
      const child = this.getNode(childName);
      if (child) {
        const elements = this.domElements.get(childName);
        if (elements) {
          elements.forEach(el => {
            el.textContent = child.value;
          });
        }
      }
    });
  }
}

const COMMAND_LABELS = {
  'Type': 'Message Type',
  'To': 'To',
  'CC': 'CC',
  'Cc': 'CC',
  'Subj': 'Subject',
  'Subject': 'Subject',
  'Attach': 'Attachments',
  'SeqSet': 'Sequence Number',
  'SeqInc': 'Increment Sequence',
  'Def': 'Define Variable',
  'Define': 'Define Variable',
  'Readonly': 'Read Only',
  'Form': 'Form Names',
  'ReplyTemplate': 'Reply Template',
  'Msg': 'Message Body'
};

function parseTemplate(content) {
  const state = new TemplateState();
  const lines = content.split('\n');

  lines.forEach(line => {
    if (line.toLowerCase().startsWith('def:')) {
      const def = parseDef(line);
      if (def) {
        state.addNode(new TemplateNode(def.name, 'var', def.description));
        const promptMatch = line.match(/<(Ask|Select)[^>]+>/);
        if (promptMatch) {
          state.setPrompt(def.name, promptMatch[0]);
        }
      }
    }
  });

  const varRegex = /<Var\s+([^>]+)>/gi;
  const askRegex = /<Ask\s+([^>]+)>/gi;
  const selectRegex = /<Select\s+([^:]+):([^>]+)>/gi;

  lines.forEach(line => {
    let match;
    while ((match = varRegex.exec(line)) !== null) {
      const varName = match[1];
      if (!state.getNode(varName)) {
        state.addNode(new TemplateNode(varName, 'var'));
      }
    }

    while ((match = askRegex.exec(line)) !== null) {
      const [prompt, options] = parseAskPrompt(match[1]);
      const node = new TemplateNode(prompt, 'ask');
      if (options) {
        node.options = options;
      }
      state.addNode(node);
    }

    while ((match = selectRegex.exec(line)) !== null) {
      const [name, options] = parseSelectOptions(match[1], match[2]);
      const node = new TemplateNode(name, 'select');
      node.options = options;
      state.addNode(node);
    }
  });

  return state;
}

function parseDef(line) {
  const match = /Def:\s*([^=]+)=<([^>]+)>/i.exec(line);
  if (match) {
    return {
      name: match[1].trim(),
      description: match[2].trim()
    };
  }
  return null;
}

function parseAskPrompt(text) {
  const parts = text.split(',');
  const prompt = parts[0].trim();
  const options = parts.slice(1);
  return [prompt, options];
}

function extractDescription(text) {
  const descMatch = text.match(/\((.*?)\)/);
  return descMatch ? descMatch[1] : null;
}

function renderPrompt(originalTag, name, id, extraAttrs = {}) {
  if (originalTag.startsWith('<Select')) {
    const selectMatch = originalTag.match(/<Select\s+([^:]+):([^>]+)>/);
    if (selectMatch) {
      const [, selectName, options] = selectMatch;
      const parsedOptions = parseSelectOptions(selectName, options)[1];
      return renderSelect(name, id, originalTag, parsedOptions, extraAttrs);
    }
  }

  const isMultiline = originalTag.includes(',MU');
  const isUppercase = originalTag.includes(',UP') || originalTag.includes(',UPPERCASE');
  const description = extractDescription(originalTag);

  if (isMultiline) {
    return renderTextarea(name, id, originalTag, description, isUppercase, extraAttrs);
  }

  return renderInput(name, id, originalTag, description, isUppercase, extraAttrs);
}

function renderSelect(name, id, originalTag, options, extraAttrs = {}) {
  const attrs = Object.entries(extraAttrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const optionsHtml = options
    .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
    .join('');

  return `<select class="form-select template-select"
            data-node="${name}"
            id="${id}"
            data-original-tag="${originalTag}"
            ${attrs}>
            <option value="">Choose ${name}</option>
            ${optionsHtml}
            </select>`;
}

function renderTextarea(name, id, originalTag, description, isUppercase, extraAttrs = {}) {
  const attrs = Object.entries(extraAttrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  return `<textarea class="form-control p-1"
                  data-node="${name}"
                  id="${id}"
                  title="${description || name}"
                  placeholder="${description || name}"
                  data-original-tag="${originalTag}"
                  ${isUppercase ? 'data-uppercase="true"' : ''}
                  ${attrs}></textarea>`;
}

function renderInput(name, id, originalTag, description, isUppercase, extraAttrs = {}) {
  const attrs = Object.entries(extraAttrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  return `<input type="text"
          class="var-input"
          data-node="${name}"
          id="${id}"
          title="${description || name}"
          placeholder="${description || name}"
          data-original-tag="${originalTag}"
          ${isUppercase ? 'data-uppercase="true"' : ''}
          autocomplete="off"
          data-form-type="other"
          data-lpignore="true" data-1p-ignore="true"
          ${attrs}>`;
}

function parseSelectOptions(name, optionsStr) {
  const options = optionsStr.split(',').map(opt => {
    const [label, value] = opt.split('=');
    return { label: label.trim(), value: (value ? value.trim() : label.trim()) };
  });
  return [name.trim(), options];
}

async function templateToHtml(content, state) {
  content = content.replace(/\r\n/g, '\n');
  const parts = content.split(/Msg:\s*\n/i);
  const headerSection = parts[0];
  const messageSection = parts.length > 1 ? parts[1] : '';

  const headerLines = headerSection.split('\n');
  const definitions = [];
  const headers = [];

  headerLines.forEach(line => {
    if (line.trim().startsWith('Def:')) {
      definitions.push(line);
    } else {
      headers.push(line);
    }
  });

  const priorityHeaders = [];
  const otherHeaders = [];

  headers.forEach(line => {
    if (line.startsWith('To:') || line.startsWith('Subj:')) {
      priorityHeaders.push(line);
    } else {
      otherHeaders.push(line);
    }
  });

  const orderedHeaders = [...priorityHeaders, ...otherHeaders];
  let headerHtml = await processSection(orderedHeaders.join('\n'), state, true);
  const headersList = document.getElementById('headers_list');
  if (headersList) headersList.innerHTML = headerHtml;

  let messageHtml = await processSection(messageSection, state, false);
  const messageContent = document.getElementById('message_content');
  if (messageContent) messageContent.innerHTML = messageHtml;

  return '';
}

async function processSection(content, state, isHeader = false) {
  let html = content.split('\n').map(line => {
    if (!line.trim()) return line;

    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const command = line.substring(0, colonIndex).trim();
      const rest = line.substring(colonIndex + 1);

      if (isHeader && COMMAND_LABELS[command]) {
        return `${COMMAND_LABELS[command]}: ${rest}`;
      }

      if (line.startsWith('Def:')) {
        const def = parseDef(line);
        if (def && state.getNode(def.name)) {
          const node = state.getNode(def.name);
          if (node) {
            return `${def.name.trim()}: <${node.description}>`;
          }
        }
      }
    }
    return line;
  }).join('\n');

  html = html.replace(/<Ask\s+([^>]+)>/gi, (match, content) => {
    const [prompt] = parseAskPrompt(content);
    const id = _.uniqueId('ask_');
    const node = state.getNode(prompt) || new TemplateNode(prompt, 'ask');
    state.addNode(node);
    return renderPrompt(match, prompt, id);
  });

  html = html.replace(/<Select\s+([^:]+):([^>]+)>/gi, (match, name, options) => {
    const id = _.uniqueId('select_');
    const node = state.getNode(name) || new TemplateNode(name, 'select');
    node.options = parseSelectOptions(name, options)[1];
    state.addNode(node);

    const optionsHtml = node.options
      .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
      .join('');

    return `<select class="form-select template-select"
                data-node="${name}"
                id="${id}"
                data-original-tag="${match}">
                <option value="">Choose ${name}</option>
                ${optionsHtml}
                </select>`;
  });

  html = html.replace(/<Var\s+([^>]+)>/gi, (match, name) => {
    const id = _.uniqueId('var_');
    const node = state.getNode(name) || new TemplateNode(name, 'var');
    state.addNode(node);
    const originalTag = state.getPrompt(name) || match;

    return renderPrompt(originalTag, name, id, {
      'data-var': name,
      'value': node.value || ''
    });
  });

  return html;
}

function setupVariableHandlers() {
  const container = document.querySelector('.container');
  if (!container) return;
  
  container.addEventListener('focusin', (e) => {
    if (e.target.matches('input[data-var]')) {
      const varName = e.target.dataset.var;
      document.querySelectorAll(`input[data-var="${varName}"]`).forEach(el => el.classList.add('linked-active'));
    }
  });

  container.addEventListener('focusout', (e) => {
    if (e.target.matches('input[data-var]')) {
      const varName = e.target.dataset.var;
      document.querySelectorAll(`input[data-var="${varName}"]`).forEach(el => el.classList.remove('linked-active'));
    }
  });

  container.addEventListener('input', (e) => {
    if (e.target.matches('input[data-var]')) {
      const varName = e.target.dataset.var;
      const value = e.target.value;

      document.querySelectorAll(`input[data-var="${varName}"]`).forEach(el => {
        el.value = value;
        updateInputWidth(el);
      });

      state.updateValue(varName, value);
    }
  });
}

let state;

function checkAllPromptsFilled() {
  let allFilled = true;

  document.querySelectorAll('[data-original-tag]').forEach(el => {
    const value = el.value;
    if (!value || value.trim() === '') {
      allFilled = false;
    }
  });

  const saveBtn = document.getElementById('save');
  if (saveBtn) saveBtn.disabled = !allFilled;
}

const measureSpan = document.createElement('span');
measureSpan.className = 'measure-span';
document.body.appendChild(measureSpan);

function updateInputWidth(input) {
  const inputStyle = window.getComputedStyle(input);
  measureSpan.style.font = inputStyle.font;
  const content = input.value || input.getAttribute('placeholder') || '';
  measureSpan.textContent = content;

  const desiredWidth = measureSpan.offsetWidth + 8;
  const container = input.closest('.card-body') || input.closest('.container');
  const containerWidth = container ? container.offsetWidth : window.innerWidth;
  const maxWidth = Math.min(containerWidth * 0.9, 400);
  
  input.style.width = Math.min(desiredWidth, maxWidth) + 'px';
}

function setupInputResize() {
  const inputs = document.querySelectorAll('.message-section input[type="text"], #headers_list input[type="text"]');

  inputs.forEach(el => updateInputWidth(el));

  const container = document.querySelector('.container');
  if (container) {
    container.addEventListener('input', (e) => {
      if (e.target.matches('input[type="text"]')) {
        updateInputWidth(e.target);
      }
    });
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'placeholder') {
        updateInputWidth(mutation.target);
      }
    });
  });

  document.querySelectorAll('input[type="text"]').forEach(el => {
    observer.observe(el, {
      attributes: true,
      attributeFilter: ['placeholder']
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const templateName = new URLSearchParams(window.location.search).get('template');

  if (!templateName) {
    const err = document.getElementById('template_error');
    if (err) {
      err.textContent = 'No template specified';
      err.style.display = 'block';
    }
    return;
  }

  state = new TemplateState();
  state.templateName = templateName;
  const title = document.getElementById('template_title');
  if (title) title.textContent = templateName;

  const origTemplateName = templateName;
  const queryParams = new URLSearchParams(window.location.search);

  fetch(`/api/template?${queryParams}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      return response.text();
    })
    .then(async templateContent => {
      state = parseTemplate(templateContent);
      state.templateName = origTemplateName;

      await templateToHtml(templateContent, state);
      setupInputResize();
      setupVariableHandlers();
      checkAllPromptsFilled();

      const container = document.querySelector('.container');
      if (container) {
        container.addEventListener('input', (e) => {
          if (e.target.matches('[data-original-tag]')) {
            checkAllPromptsFilled();
          }
        });
        container.addEventListener('change', (e) => {
          if (e.target.matches('[data-original-tag]')) {
            checkAllPromptsFilled();
          }
        });
      }
    })
    .catch(err => {
      const errDiv = document.getElementById('template_error');
      if (errDiv) {
        errDiv.textContent = `Failed to process template: ${err.message}`;
        errDiv.style.display = 'block';
      }
    });

  const container = document.querySelector('.container');
  if (container) {
    container.addEventListener('input', (e) => {
      if (e.target.matches('input, textarea, select')) {
        const nodeName = e.target.dataset.node;
        if (nodeName) {
          let value = e.target.value;
          if (e.target.dataset.uppercase) {
            value = value.toUpperCase();
            e.target.value = value;
          }
          state.updateValue(nodeName, value);
        }
      }
    });
  }

  const cancelBtn = document.getElementById('cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', () => window.close());
  const saveBtn = document.getElementById('save');
  if (saveBtn) saveBtn.addEventListener('click', () => submitTemplate());

  async function submitTemplate() {
    try {
      const formData = {
        responses: state.collectFormData().responses
      };

      const queryParams = new URLSearchParams(window.location.search);
      const response = await fetch(`/api/form?${queryParams}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      window.close();

    } catch (err) {
      const errDiv = document.getElementById('template_error');
      if (errDiv) {
        errDiv.textContent = `Failed to submit template: ${err.message}`;
        errDiv.style.display = 'block';
      }
    }
  }
});
