import {
  decorateIcons,
  toClassName,
  readBlockConfig,
  fetchPlaceholders,
} from '../../scripts/lib-franklin.js';

const FORMS_API_ENDPOINT = 'https://ms-forms-service-production.digitalpfizer.com/api/v2/forms';

async function formsApiRequest(token, method = 'GET', payload = null) {
  const headers = new Headers();
  headers.append('x-config-token', token);
  const response = await fetch(FORMS_API_ENDPOINT, {
    method,
    headers,
    body: payload,
  });
  return response;
}

async function fetchBuilderForm(token) {
  const resp = await formsApiRequest(token);
  if (resp.status === 200) {
    const json = await resp.json();
    const formDef = {
      submitTo: FORMS_API_ENDPOINT,
      configToken: token,
      csrfToken: json.data.csrfToken,
    };
    formDef.data = json.data.fields.map((fd) => {
      if (fd.id === 'submit') {
        return {
          Field: 'submit',
          Label: 'Submit',
          Placeholder: '',
          Type: 'submit',
          Format: '',
          Mandatory: '',
          Options: '',
          Rules: '',
          Extra: '/forms/thank-you',
        };
      }
      let mandatory = '';
      if (fd.validators) mandatory = fd.validators.find((v) => v.type === 'required') ? 'x' : '';
      return {
        Field: fd.name,
        Label: fd.label,
        Type: fd.type,
        Value: fd.value,
        Mandatory: mandatory,
        Placeholder: fd.placeholder || '',
      };
    });
    return (formDef);
  }
  return { error: `Error loading webform: ${token}` };
}

/**
 * Extract all form data for submission
 * @param {Object} form The form
 * @returns {Object} Object of all form data in id (key) value pairs
 */
function constructPayload(form) {
  const payload = {};
  [...form.querySelectorAll('[name]')].forEach((fe) => {
    if (fe.type.startsWith('select')) { // don't add disabled select values to payload
      if (!fe.options[fe.selectedIndex].disabled) payload[fe.id] = fe.value;
    } else if (fe.type === 'checkbox') {
      if (fe.checked) { // add all checked checkbox values to the payload
        if (payload[fe.id]) payload[fe.id] += `, ${fe.value}`;
        else payload[fe.id] = fe.value;
      }
    } else if (fe.type === 'radio') {
      if (fe.checked) payload[fe.id] = fe.value;
    } else if (fe.id) {
      payload[fe.id] = fe.value;
    }
  });
  return payload;
}

async function submitForm(form) {
  const payload = constructPayload(form);
  const { csrfToken, configToken } = form.dataset;
  payload.csrfToken = csrfToken;
  const resp = await fetch(form.dataset.action, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
      'x-config-token': configToken,
    },
    body: JSON.stringify(csrfToken ? payload : { data: payload }),
  });
  const message = await resp.text();
  return ({
    success: resp.status < 400,
    status: resp.status,
    message,
  });
}

/**
 * Build form button
 * @param {Object} fd The field definition
 * @returns {Element} BUTTON element with Label text content
 */
function createButton(fd) {
  const button = document.createElement('button');
  button.textContent = fd.Label;
  button.classList.add('button');
  button.type = fd.Type;
  if (fd.Type === 'submit') {
    button.addEventListener('click', async (event) => {
      const form = button.closest('form');
      if (form.checkValidity()) {
        event.preventDefault();
        button.disabled = false;
        const submission = await submitForm(form);
        if (submission.success) {
          const redirectTo = fd.Extra;
          const resp = await fetch(`${redirectTo}.plain.html`);
          const html = await resp.text();
          const container = form.closest('.section');
          container.outerHTML = html;
        } else {
          // eslint-disable-next-line no-alert
          window.alert(submission.message);
        }
      }
    });
  }
  if (fd.Icon) {
    button.className = 'has-icon';
    const icon = document.createElement('span');
    icon.className = `icon icon-${fd.Icon}`;
    button.append(icon);
  }
  return button;
}

/**
 * Build form heading
 * @param {Object} fd The field definition
 * @returns {Element} H3 element with Label text content
 */
function createHeading(fd) {
  const heading = document.createElement('h3');
  heading.textContent = fd.Label;
  return heading;
}

/**
 * Build form copy
 * @param {Object} fd The field definition
 * @returns {Element} P element with Label text content
 */
function createCopy(fd) {
  const copy = document.createElement('p');
  copy.textContent = fd.Label;
  return copy;
}

/**
 * Build form field label
 * @param {Object} fd The field definition
 * @returns {Element} LABEL element linked to Field with Label text content
 */
function createLabel(fd) {
  const label = document.createElement('label');
  label.setAttribute('for', fd.Field);
  label.textContent = fd.Label;
  if (fd.Mandatory === 'x') label.classList.add('required');
  return label;
}

/**
 * Build form field input
 * @param {Object} fd The field definition
 * @returns {Element} INPUT element with Type, Placeholder, and optional Value
 */
function createInput(fd) {
  const input = document.createElement('input');
  input.type = fd.Type;
  input.id = fd.Field;
  input.setAttribute('name', fd.Field);
  if (fd.Placeholder) input.setAttribute('placeholder', fd.Placeholder);
  if (fd.Value) input.value = fd.Value;
  if (fd.Mandatory === 'x') input.required = true;
  return input;
}

/**
 * Build form field textarea
 * @param {Object} fd The field definition
 * @returns {Element} TEXTAREA element with Placeholder and optional Value
 */
function createTextArea(fd) {
  const textarea = document.createElement('textarea');
  textarea.id = fd.Field;
  textarea.setAttribute('name', fd.Field);
  if (fd.Placeholder) textarea.setAttribute('placeholder', fd.Placeholder);
  if (fd.Value) textarea.value = fd.Value;
  if (fd.Mandatory === 'x') textarea.required = true;
  return textarea;
}

/**
 * Build form field select
 * @param {Object} fd The field definition
 * @returns {Element} SELECT element with OPTIONs
 */
function createSelect(fd) {
  const selectWrapper = document.createElement('div');
  selectWrapper.className = 'select-wrapper';
  const select = document.createElement('select');
  select.id = fd.Field;
  select.setAttribute('name', fd.Field);
  if (fd.Placeholder) {
    const ph = document.createElement('option');
    ph.textContent = fd.Placeholder;
    ph.selected = true;
    ph.disabled = true;
    select.append(ph);
  }
  fd.Options.split(',').forEach((o) => {
    const option = document.createElement('option');
    option.textContent = o.trim();
    option.value = o.trim();
    select.append(option);
  });
  if (fd.Mandatory === 'x') select.required = true;
  selectWrapper.append(select);
  return selectWrapper;
}

/**
 * Build form field checkboxes or radios
 * @param {Object} fd The field definition
 * @returns {Element} INPUT element of type radio or checkbox with options
 */
function createSelections(fd) {
  const selections = [];
  fd.Options.split(',').forEach((option) => {
    const wrapper = document.createElement('div');
    wrapper.className = `${fd.Type}-wrapper`;
    const o = option.trim();
    const selection = createInput({
      Type: fd.Type,
      Field: toClassName(`${fd.Field} ${o}`),
      Value: o,
    });
    selection.setAttribute('name', fd.Field);
    const label = createLabel({
      Field: toClassName(`${fd.Field} ${o}`),
      Label: o,
    });
    wrapper.append(selection, label);
    selections.push(wrapper);
  });
  return selections;
}

/**
 * Build form field support text
 * @param {Object} fd The field definition
 * @returns {Element} SMALL element with field support text
 */
function createSupport(fd) {
  const support = document.createElement('small');
  support.textContent = fd.Support;
  return support;
}

function applyRules(form, rules) {
  const payload = constructPayload(form);
  rules.forEach((field) => {
    const { type, condition: { key, operator, value } } = field.rule;
    if (type === 'visible') {
      if (operator === 'eq') {
        if (payload[key] === value) {
          form.querySelector(`.${field.fieldId}`).classList.remove('hidden');
        } else {
          form.querySelector(`.${field.fieldId}`).classList.add('hidden');
        }
      }
    }
  });
}

async function fetchSpreadsheetForm(formURL) {
  const { pathname } = new URL(formURL);
  const resp = await fetch(pathname);
  const json = await resp.json();
  [json.submitTo] = pathname.split('.json');
  return json;
}

async function createForm(formDefinition) {
  const form = document.createElement('form');
  const rules = [];
  // eslint-disable-next-line prefer-destructuring
  form.dataset.action = formDefinition.submitTo;
  form.dataset.csrfToken = formDefinition.csrfToken;
  form.dataset.configToken = formDefinition.configToken;
  formDefinition.data.forEach((fd) => {
    fd.Type = fd.Type || 'text';
    // wrap form field
    const fieldWrapper = document.createElement('div');
    const style = fd.Style ? ` form-${fd.Style}` : '';
    const fieldId = `form-${fd.Type}-wrapper${style}`;
    fieldWrapper.className = fieldId;
    fieldWrapper.classList.add('field-wrapper');
    if (fd.Section) fieldWrapper.dataset.section = fd.Section;
    // build form field
    switch (fd.Type) {
      case 'heading':
        fieldWrapper.append(createHeading(fd));
        break;
      case 'copy':
        fieldWrapper.append(createCopy(fd));
        break;
      case 'select':
        if (fd.Label) fieldWrapper.append(createLabel(fd));
        fieldWrapper.append(createSelect(fd));
        if (fd.Support) fieldWrapper.append(createSupport(fd));
        break;
      case 'checkbox':
        if (fd.Label) fieldWrapper.append(createLabel(fd));
        fieldWrapper.append(...createSelections(fd));
        break;
      case 'radio':
        if (fd.Label) fieldWrapper.append(createLabel(fd));
        fieldWrapper.append(...createSelections(fd));
        break;
      case 'textarea':
        if (fd.Label) fieldWrapper.append(createLabel(fd));
        fieldWrapper.append(createTextArea(fd));
        break;
      case 'submit':
        fieldWrapper.classList.add('form-button-wrapper');
        fieldWrapper.append(createButton(fd));
        break;
      case 'hidden':
        fieldWrapper.append(createInput(fd));
        break;
      default:
        if (fd.Label) fieldWrapper.append(createLabel(fd));
        fieldWrapper.append(createInput(fd));
        if (fd.Support) fieldWrapper.append(createSupport(fd));
    }
    // apply rules
    if (fd.Rules) {
      try {
        rules.push({ fieldId, rule: JSON.parse(fd.Rules) });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`Invalid rule ${fd.Rules}: ${e}`);
      }
    }
    form.append(fieldWrapper);
  });

  // section related field wrappers
  const sectionedFields = [...form.querySelectorAll('[data-section]')];
  if (sectionedFields) {
    const sections = [...new Set(sectionedFields.map((f) => f.dataset.section))];
    if (sections.length > 1) {
      const ph = await fetchPlaceholders();
      // build section indicator
      const indicator = document.createElement('div');
      indicator.className = 'form-section-indicator';
      const progress = document.createElement('div');
      progress.innerHTML = '<div class="completed"></div>';
      const ol = document.createElement('ol');
      indicator.append(progress, ol);
      form.prepend(indicator);
      sections.forEach((section, i) => {
        // add tab to indicator
        const li = document.createElement('li');
        li.dataset.sections = sections.length;
        li.id = `tab-${toClassName(section)}`;
        li.innerHTML = section;
        if (!i) li.setAttribute('aria-current', 'section');
        ol.append(li);
        // build section
        const sectionWrapper = document.createElement('section');
        sectionWrapper.className = `form-section form-section-${toClassName(section)}`;
        sectionWrapper.id = `section-${toClassName(section)}`;
        if (i) sectionWrapper.setAttribute('aria-hidden', true);
        const fieldsInSection = sectionedFields.filter((f) => f.dataset.section === section);
        sectionWrapper.append(...fieldsInSection);

        const btnWrapper = sectionWrapper.querySelector('.form-button-wrapper') || document.createElement('div');
        btnWrapper.classList.add('field-wrapper', 'form-button-wrapper');
        // add button to navigate to next section
        if (i !== sections.length - 1) {
          const nextBtn = createButton({
            Label: `${ph.formContinue} ${sections[i + 1]}`,
            Type: 'button',
            Icon: 'arrow-right',
          });
          nextBtn.addEventListener('click', () => {
            const invalid = [...sectionWrapper.querySelectorAll('[name]')].find((f) => !f.checkValidity());
            if (!invalid) { // all form fields are valid, proceed to next section
              form.querySelectorAll('.form-section').forEach((s) => s.setAttribute('aria-hidden', true));
              form.querySelector(`.form-section-${toClassName(sections[i + 1])}`).removeAttribute('aria-hidden');
              // update indicator
              ol.querySelector('[aria-current]').removeAttribute('aria-current');
              li.dataset.complete = true;
              [...ol.children][i + 1].setAttribute('aria-current', 'section');
              progress.querySelector('.completed').style.width = `${((i + 1) / (sections.length - 1)) * 100}%`;
            } else { // form is invalid, redirect users to invalid field
              invalid.scrollIntoView({ behavior: 'smooth' });
              invalid.reportValidity();
              invalid.focus();
            }
          });
          btnWrapper.append(nextBtn);
        }
        // add button to navigate to previous section
        if (i) {
          const prevBtn = createButton({
            Label: `${ph.formBack} ${sections[i - 1]}`,
            Type: 'button',
            Icon: 'arrow-left',
          });
          prevBtn.addEventListener('click', () => {
            form.querySelectorAll('.form-section').forEach((s) => s.setAttribute('aria-hidden', true));
            form.querySelector(`.form-section-${toClassName(sections[i - 1])}`).removeAttribute('aria-hidden');
            // update indicator
            ol.querySelector('[aria-current]').removeAttribute('aria-current');
            li.dataset.complete = true;
            [...ol.children][i - 1].setAttribute('aria-current', 'section');
            progress.querySelector('.completed').style.width = `${((i - 1) / (sections.length - 1)) * 100}%`;
          });
          btnWrapper.prepend(prevBtn);
        }
        if (btnWrapper.children.length > 1) btnWrapper.classList.add('form-button-multi');
        if (!sectionWrapper.querySelector('.form-button-wrapper')) sectionWrapper.append(btnWrapper);
        form.append(sectionWrapper);
      });
    }
  }

  decorateIcons(form);
  form.addEventListener('change', () => applyRules(form, rules));
  applyRules(form, rules);

  return (form);
}

export default async function decorate(block) {
  let formDef;
  const config = readBlockConfig(block);

  if (config && config.token) {
    const { token } = config;
    block.textContent = '';
    formDef = await fetchBuilderForm(token);
  } else {
    const form = block.querySelector('a[href$=".json"]');
    if (form) formDef = await fetchSpreadsheetForm(form.href);
    block.textContent = '';
  }

  if (formDef) {
    if (formDef.error) {
      block.classList.add('form-error');
      block.innerHTML = `<span class="icon icon-error"></span>
        <p>${formDef.error}</p>`;
      decorateIcons(block);
    } else {
      const formEl = await createForm(formDef);
      block.append(formEl);
    }
  }
}
