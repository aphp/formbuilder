/**
 * A utility class
 */
import {PropertyGroup} from '@lhncbc/ngx-schema-form/lib/model';
import traverse from 'traverse';
import fhir, {UsageContext} from 'fhir/r4';
import {isEqual} from 'lodash-es';
import {ITreeNode} from '@bugsplat/angular-tree-component/lib/defs/api';
import copy from 'fast-copy';
import {ISchema} from "@lhncbc/ngx-schema-form/lib/model/ISchema";

export class Util {
  static readonly ENABLEWHEN_DEPENDENCY_WARNING_CODE = 'ENABLEWHEN_DEPENDENCY'
  static readonly ITEM_CONTROL_EXT_URL = 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl';
  static readonly VARIABLE_URL = 'http://hl7.org/fhir/StructureDefinition/variable';
  static readonly LAUNCH_CONTEXT_URL = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext';
  static readonly HIDDEN_ITEM_URL = 'http://hl7.org/fhir/StructureDefinition/questionnaire-hidden';
  static readonly CODE_SYSTEM_IDENTIFIER_TYPE_URL = 'https://aphp.fr/ig/fhir/eds/CodeSystem/aphp-eds-identifier-type-cs';
  static readonly CODE_SYSTEM_NAMESPACE_URL = 'https://aphp.fr/ig/fhir/eds/CodeSystem/aphp-eds-name-space-cs';
  static readonly ED_PROFILE = 'https://aphp.fr/ig/fhir/eds/StructureDefinition/aphp-eds-questionnaire';
  static readonly IG_ROOT_URL = 'https://aphp.fr/ig/fhir/eds';
  static readonly FORMBUILDER_ENDPOINT = 'https://aphp.fr/ig/fhir/eds/Endpoint/form-builder';
  static HELP_BUTTON_EXTENSION = {
    url: Util.ITEM_CONTROL_EXT_URL,
    valueCodeableConcept: {
      text: 'Intention',
      coding: [
        {
          code: 'help',
          display: 'Help-Button',
          system: 'http://hl7.org/fhir/questionnaire-item-control'
        }
      ]
    }
  };

  static helpItemTemplate = {
    // text: '',  Update with value from input box.
    type: 'display',
    linkId: '', // Update at run time.
    extension: [Util.HELP_BUTTON_EXTENSION]
  };
  private static _defaultForm = {
    resourceType: 'Questionnaire',
    title: 'New Form',
    status: 'draft',
    item: []
  };

  private static _answerTypeMap = {
    boolean: 'answerBoolean',
    integer: 'answerInteger',
    decimal: 'answerDecimal',
    date: 'answerDate',
    dateTime: 'answerDateTime',
    time: 'answerTime',
    string: 'answerString',
    text: 'answerString',
    choice: 'answerCoding',
    'open-choice': 'answerCoding',
    quantity: 'answerQuantity',
    reference: 'answerReference'
  };

  // Capitalize the camel case strings.
  static capitalize(str): string {
    let ret = '';
    if (str && str.length > 0) {
      ret = str.split(/(?=[A-Z])/).join(' ');
      ret = ret.charAt(0).toUpperCase() + ret.substring(1);
    }
    return ret;
  }


  /**
   * Identify if a particular widget under the group is visible.
   *
   * @param group - Group property of the widget
   * @param propertyId - It is '.' delimited property name of its descendants.
   */
  static isVisible(group: PropertyGroup, propertyId: string) {
    const path = propertyId.split('.');
    let visible = group.visible;
    for (let i = 0; i < path.length && visible; i++) {
      group = group.getProperty(path[i]);
      visible = group.visible;
    }
    return visible;

  }


  /**
   * Identify if an input is empty, typically intended to detect user input.
   * The definition of empty:
   * Anything null, undefined or empty string is empty.
   * Any object or an array containing all empty elements is empty.
   *
   * @param json - Input to test the emptiness.
   * @return boolean - True if empty.
   */
  static isEmpty(json: unknown): boolean {
    let ret = true;
    if (typeof json === 'number') {
      ret = false; // Any number is non-empty
    } else if (typeof json === 'boolean') {
      ret = false; // Any boolean is non-empty
    } else if (!json) {
      ret = true; // empty string, null and undefined are empty
    } else if (json instanceof Date) {
      ret = false; // Date is non-empty
    } else if (Array.isArray(json)) { // Iterate through array
      for (let i = 0; ret && i < json.length; i++) {
        ret = Util.isEmpty(json[i]);
      }
    } else if (typeof json === 'object') { // Iterate through object properties
      if (Object.keys(json).length === 0) {
        ret = true;
      } else {
        for (let i = 0, keys = Object.keys(json); ret && i < keys.length; i++) {
          if (json.hasOwnProperty(keys[i])) {
            ret = Util.isEmpty(json[keys[i]]);
          }
        }
      }
    } else {
      ret = false;
    }
    return ret;
  }


  /**
   * Convert lforms answers to FHIR equivalent.
   * @param lformsAnswers - Lforms answers.
   */
  static getFhirAnswerOption(lformsAnswers: any []) {
    if (!lformsAnswers) {
      return null;
    }
    const answerOption: any [] = [];
    lformsAnswers.forEach((answer) => {
      answerOption.push({code: answer.AnswerStringID, system: 'http://loinc.org', display: answer.DisplayText});
    });
    return answerOption;
  }


  /**
   * Convert lforms data type to FHIR data type
   * @param lformsType - Lforms data type.
   */
  static getFhirType(lformsType: string): string {
    let ret = 'string';
    switch (lformsType) {
      case 'INT':
        ret = 'integer';
        break;
      case 'REAL':
        ret = 'decimal';
        break;
      case 'DT':
      case 'DAY':
      case 'MONTH':
      case 'YEAR':
        ret = 'date';
        break;
      case 'DTM':
        ret = 'dateTime';
        break;
      case 'ST':
      case 'EMAIL':
      case 'PHONE':
        ret = 'string';
        break;
      case 'TITLE':
        ret = 'display';
        break;
      case 'TM':
        ret = 'time';
        break;
      case 'SECTION':
      case null: // Null type for panels.
        ret = 'group';
        break;
      case 'URL':
        ret = 'url';
        break;
      case 'QTY':
        ret = 'quantity';
        break;
      case 'CNE':
        ret = 'choice';
        break;
      case 'CWE':
        ret = 'open-choice';
        break;
    }
    return ret;
  }


  /**
   * Convert lforms units to equivalent FHIR extensions.
   * @param units - units in lforms format.
   */
  static convertUnitsToExtensions(units): any [] {
    if (!units) {
      return null;
    }
    const ret: any [] = [];
    units.forEach((unit) => {
      ret.push({
        url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-unit',
        valueCoding: {
          code: unit,
          system: 'http://unitsofmeasure.org',
          display: unit
        }
      });
    });
    return ret;
  }


  /**
   * Find index of the item containing help text.
   * @param itemsArray - List of items to search for.
   */
  static findItemIndexWithHelpText(itemsArray) {
    if (!itemsArray) {
      return -1;
    }
    return itemsArray?.findIndex((item) => {
      let ret = false;
      if (item.type === 'display') {
        ret = item.extension?.some((e) => {
          return e.url === Util.ITEM_CONTROL_EXT_URL &&
            e.valueCodeableConcept?.coding?.some((coding) => coding.code === 'help');
        });
      }
      return ret;
    });
  }


  /**
   * Prunes the questionnaire model using the following conditions:
   * . Removes 'empty' values from the object. Emptiness is defined in Util.isEmpty().
   *   The following are considred empty: undefined, null, {}, [], and  ''.
   * . Removes any thing with __$* keys.
   * . Removes functions.
   * . Converts __$helpText to appropriate FHIR help text item.
   * . Converts converts enableWhen[x].question object to linkId.
   *
   * @param fhirQInternal - Questionnaire object used in the form builder.
   */
  static convertToQuestionnaireJSON(fhirQInternal) {
    const value = copy(fhirQInternal); // Deep copy. Leave the internal model untouched.
    traverse(value).forEach(function (node) {
      this.before(function () {
        Util.setIdentifierType(node);
        if (node && Array.isArray(node)) {
          // Remove empty elements, nulls and undefined from the array. Note that empty elements do not trigger callbacks.
          this.update(node.filter((e) => {
            return e !== null && e !== undefined
          }));
        } else if (Util.hasHelpText(node)) {
          Util.eliminateEmptyFields(node.__$helpText);
          if (!node.item) {
            node.item = [];
          }
          node.item.push(node.__$helpText);
          delete node.__$helpText;
          this.update(node);
        }
        // Internally the question is target TreeNode. Change that to node's linkId.
        else if (this.key === 'question' && typeof node?.data === 'object') {
          this.update(node.data.linkId);
        }
        // Update type for header
        else if (this.key === 'type' && (node === 'group' || node === 'display')) {
          const type = this.parent.node.item?.length > 0 ? 'group' : 'display';
          this.update(type);
        }
      });

      this.after(function () {
        // Remove all custom fields starting with __$ and empty fields.
        if (this.key?.startsWith('__$') || typeof node === 'function' || Util.isEmpty(node)) {
          // tslint:disable-next-line:only-arrow-functions
          if (this.notRoot) {
            this.remove(); // Splices off any array elements.
          }
        }
      });
    });
    return value;
  }

  /**
   * Check for existence of help text values. The values are plain text, and valueStrings from css/xhtml
   * rendering extensions
   *
   * @param node - fhir.QuestionnaireItem.
   */
  static hasHelpText(node): boolean {
    return node?.__$helpText?.text?.trim().length > 0 ||
      node?.__$helpText?._text?.extension?.some((ext: fhir.Extension) => {
        return ext.valueString?.trim().length > 0;
      });
  }

  /**
   * Remove empty fields from a json object.
   * @param json - JSON object
   */
  static eliminateEmptyFields(json) {
    traverse(json).forEach(function (node) {
      this.before(function () {
        if (node && Array.isArray(node)) {
          // Remove empty elements, nulls and undefined from the array. Note that empty elements do not trigger callbacks.
          this.update(node.filter((e) => {
            return e !== null && e !== undefined
          }));
        }
      });

      this.after(function () {
        // Remove all empty fields.
        if (typeof node === 'function' || Util.isEmpty(node)) {
          if (this.notRoot) {
            this.remove(); // Splices off any array elements.
          }
        }
      });
    });
  }

  static removeEmptyElements(item) {
    traverse(item).forEach(function (node) {
      this.before(function () {
        if (node && Array.isArray(node)) {
          // Remove empty elements, nulls and undefined from the array. Note that empty elements do not trigger callbacks.
          this.update(node.filter((e) => {
            return e !== null && e !== undefined
          }));
        }
      })
    });
  }

  static setIdentifierType(node) {
    if (node?.__$type) {
      node.type = {
        coding: [{
          system: node?.__$type.system,
          code: node?.__$type.code,
          display: node?.__$type.display
        }]
      };
    }
  }

  static removeItems(items: any[], urls: string []): void {
    if (!items) {
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      for (const url of urls) {
        if (item.url && item?.url === url) {
          items.splice(i--, 1);
        }
      }
    }
  }

  static addHiddenItemYesNoProperty(items, isHiddenParent: boolean) {

    if (
      !items ||
      (items?.linkId && typeof items.linkId === "string" && items.linkId.includes("_intention"))
    ) {
      return;
    }

    if (items.linkId) {
      items.__$hiddenItemYesNo = isHiddenParent;
    }
    if (Util.isIterable(items.extension)) {
      for (const extension of items.extension) {
        if (!extension) {
          continue;
        }
        if (extension.url === Util.HIDDEN_ITEM_URL && extension.valueBoolean) {
          items.__$hiddenItemYesNo = true;
        }
      }
    }

    if (Util.isIterable(items)) {
      for (const itemData of items) {
        this.addHiddenItemYesNoProperty(itemData, isHiddenParent);
      }
    }
    this.addHiddenItemYesNoProperty(items.item, items.__$hiddenItemYesNo);

  }

  static updateHiddenExtension(items: any, value: boolean) {
    if (!items) {
      return
    }
    if (items.linkId) {
      const hiddenExtension = {url: Util.HIDDEN_ITEM_URL, valueBoolean: true};
      if (items.extension) {
        const urls = [Util.HIDDEN_ITEM_URL];
        Util.removeItems(items.extension, urls);
        if (value) {
          items.extension.push(hiddenExtension)
        }
      } else if (value) {
        items.extension = [hiddenExtension]
      }
    }
  }

  static removeHiddenExtension(items: any, value: boolean) {
    if (!items) {
      return
    }
    if (items.linkId && !value) {
      const urls = [Util.HIDDEN_ITEM_URL];
      Util.removeItems(items.extension, urls);
    }
    if (Util.isIterable(items.item)) {
      items.item.forEach(item => Util.removeHiddenExtension(item, value));
    }
  }

  static setHiddenItemYesNo(node, isHidden) {
    if (!node) {
      return;
    }
    node.__$hiddenItemYesNo = isHidden;
    if (Util.isIterable(node.item)) {
      node.item.forEach(item => this.setHiddenItemYesNo(item, isHidden));
    }
  }

  /**
   * Create bare minimum form.
   */
  static createDefaultForm(): fhir.Questionnaire {
    return Util.cloneDefaultForm();
  }

  /**
   * Clone default form, mainly to create a new form.
   */
  static cloneDefaultForm(): fhir.Questionnaire {
    return JSON.parse(JSON.stringify(Util._defaultForm));
  }

  /**
   * Compare with default form with deep equal.
   * @param q - Questionnaire to compare with default.
   */
  static isDefaultForm(q: fhir.Questionnaire): boolean {
    return isEqual(Util._defaultForm, q);
  }

  /**
   * Find the extension based on a given url from an array.
   * @param extensions - Array of extensions.
   * @param url - The url of the extension to search for.
   */
  static findExtensionByUrl(extensions: fhir.Extension [], url: string) {
    const i = this.findExtensionIndexByUrl(extensions, url);
    return i >= 0 ? extensions[i] : null;
  }


  /**
   * Find the first index of the extension based on a given url.
   * @param extensions - Array of extensions.
   * @param url - The url of the extension to search for.
   */
  static findExtensionIndexByUrl(extensions: fhir.Extension [], url: string) {
    let ret = -1;
    if (extensions?.length) {
      ret = extensions.findIndex((ext) => {
        return ext.url === url;
      });
    }
    return ret;
  }


  /**
   * Utility to identify answer[x] field.
   * @param f - Field name
   */
  static isAnswerField(f): boolean {
    return f && f.startsWith('answer');
  }


  /**
   * Map type to answer[x] field.
   * @param type - question type
   */
  static getAnswerFieldName(type: string): string {
    return Util._answerTypeMap[type];
  }

  /**
   * Compute tree hierarchy sequence numbering.
   * @param node - Target node of computation
   */
  static getIndexPath(node: ITreeNode): number[] {
    const ret: number [] = [];
    if (node) {
      ret.push(node.index + 1);
      while (node?.level > 1) {
        node = node.parent;
        const index = node ? node.index : 0;
        ret.push(index + 1);
      }
    }
    return ret.reverse();
  }

  static filterTreeNode(el: ITreeNode, term, sperator) {
    const text = Util.getIndexPath(el).join('.') + sperator + ' ' + el.data.text;
    const result = text.toLowerCase().indexOf(term.toLowerCase()) > -1;
    return result;
  }


  /**
   * Format Node item for some display cases, for example search results of node items.
   * @param node - Input node to format the display.
   */
  static formatNodeForDisplay(node: ITreeNode) {
    let ret: string;
    if (node?.data) {
      ret = `${Util.getIndexPath(node).join('.')}: ${node.data.text}`;
    }
    return ret;
  }


  /**
   * Truncate string to display node text on the sidebar.
   * @param text - String to truncate.
   * @param limit - Length to limit the truncation.
   */
  static truncateString(text: string, limit: number = 15): string {
    return text?.length > limit ? (text.substring(0, limit).trim() + '...') : text;
  }

  static isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
      return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
  }

  static capitalizeFirstLetter(s: string) {
    if (!s && s.length < 1) {
      return '';
    }
    return s[0].toUpperCase() + s.slice(1);
  }

  static convertTitleToName(title: string): string {
    let name = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    name = Util.removeAccentsWithMapping(name)
    name = Util.toCamelCaseWithoutSpaces(name);
    name = Util.removeSpecialCharacters(name);
    name = Util.removeInvalidCharacters(name);
    name = Util.capitalizeFirstLetter(name);
    name = Util.truncate(name, 255);
    return name;
  }

  static sanitizeString(input: string): string {

    let sanitized = input?.replace(/[^A-Za-z0-9]/g, '');

    if (sanitized?.length > 64) {
      sanitized = sanitized.substring(0, 64);
    }

    return sanitized;
  }

  static toCamelCaseWithoutSpaces(str: string): string {
    return str.replace(/^\w|[A-Z]|\b\w/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
      .replace(/\s+/g, '');
  }

  static removeAccentsWithMapping(str) {
    const accentMap = {
      'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
      'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
      'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
      'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
      'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
      'ñ': 'n', 'ç': 'c', 'œ': 'oe', 'ß': 'ss'
    };

    // Using a regex to replace characters based on the mapping
    return str.split('').map(char => accentMap[char] || char).join('');
  }

  static isNotEmpty(numberValue) {
    return (numberValue !== null && numberValue !== undefined && numberValue !== '')
  }

  static removeSpecialCharacters(str: string) {
    return str.replace(/[&\/\\#, +()_$~%.'":*?<>\[\]{}]/g, '');
  }

  static truncate(str: string, n: number): string {
    return (str.length > n) ? str.slice(0, n - 1) : str;
  }

  static addProfiles(items) {
    if (!items) {
      return;
    }
    if (items.resourceType === 'Questionnaire') {
      const profiles = [Util.ED_PROFILE]
      if (items.meta) {
        items.meta.profile = profiles;
      } else {
        items.meta = {profile: profiles};
      }
    }
  }

  static setQuestionnaireVariableAndLaunchContextItems(questionnaire) {
    const exts = questionnaire.extension;
    if (Util.isIterable(exts)) {
      const variableValue = [];
      const launchCtxValue = [];
      exts.forEach(ext => {
        if (ext?.url === Util.VARIABLE_URL && ext.valueExpression) {
          variableValue.push(ext.valueExpression);
        }
        if (ext?.url === Util.LAUNCH_CONTEXT_URL) {
          if (Util.isIterable(ext.extension)) {
            const launchItem = {description: '', type: '', name: ''};
            for (const innerExt of ext.extension) {
              if (innerExt && innerExt.url === 'description') {
                launchItem.description = innerExt.valueString
              }
              if (innerExt.url === 'type') {
                launchItem.type = innerExt.valueCode
              }
              if (innerExt.url === 'name' && innerExt.valueCoding) {
                launchItem.name = innerExt.valueCoding.code
              }
            }
            launchCtxValue.push(launchItem);
          }
          questionnaire.__$launchContext = launchCtxValue;
        }
      })
      questionnaire.__$valueExpressionQuestionnaire = variableValue;
    }
  }

  static setUrl(questionnaire) {
    if (!questionnaire.id) {
      return;
    }
    questionnaire.url = `${Util.IG_ROOT_URL}/Questionnaire/${questionnaire.id}`;
  }

  static setMetaSource(questionnaire) {
    if (!questionnaire.meta) {
      return;
    }
    questionnaire.meta.source = Util.FORMBUILDER_ENDPOINT;
  }

  static setUseContext(questionnaire) {
    const useContext = questionnaire.useContext;
    if (useContext && useContext.length > 0) {
      const value = useContext?.[0].valueCodeableConcept?.coding[0];
      if (value) {
        questionnaire.__$useContext = {
          code: value.code,
          display: value.display,
          system: value.system,
          version: '0.1.0'
        };
      }
    }
  }

  static updateAnswerExpressionDescription(formProperty, property) {
    const regex = `.*answerExpression.*${property}`;
    if (formProperty.canonicalPathNotation.match(regex)) {
      const parentValue = formProperty.parent?.value;
      if (!parentValue || Object.keys(parentValue).length === 0) {
        const search = `${formProperty.parent._canonicalPath}/description`
        const prop = formProperty.parent.searchProperty(search);
        if (prop) {
          prop.setValue('TO DO', false);
        }
      }
    }
  }

  static isEmptyOrNull(str: string): boolean {
    return str === null || str === undefined || str.trim() === '';
  }

  static removeInvalidCharacters(str) {
    return str.replace(/[^A-Za-z0-9_]/g, '');
  }

  static buildUrl(baseUrl, resourceType, name) {
    return `${baseUrl}/${resourceType}/${name}`;
  }

  static isNumeric = (string) => /^[+-]?\d+(\.\d+)?$/.test(string)

  static compareUsageContext(uc1: UsageContext, uc2: UsageContext): boolean {
    // Compare code
    if (uc1.code?.system !== uc2.code.system || uc1.code?.code !== uc2.code.code) {
      return false;
    }

    // Compare valueCodeableConcept if exists
    if (uc1.valueCodeableConcept || uc2.valueCodeableConcept) {
      if (!uc1.valueCodeableConcept || !uc2.valueCodeableConcept) return false;
      if (uc1.valueCodeableConcept.coding.length !== uc2.valueCodeableConcept.coding.length) return false;
      for (let i = 0; i < uc1.valueCodeableConcept.coding.length; i++) {
        const code1 = uc1.valueCodeableConcept.coding[i];
        const code2 = uc2.valueCodeableConcept.coding[i];
        if (code1.system !== code2.system || code1.code !== code2.code) return false;
      }
    }


    return true;
  }

  static compareUsageContextArrays(arr1: UsageContext[], arr2: UsageContext[]): boolean {
    if (arr1.length !== arr2.length) return false;

    return arr1.every(uc1 => arr2.some(uc2 => Util.compareUsageContext(uc1, uc2))) &&
      arr2.every(uc2 => arr1.some(uc1 => Util.compareUsageContext(uc1, uc2)));
  }


  static setValueSetUrl(schema: ISchema, answerValueSetUrl: string) {
    schema?.widget?.showFields?.forEach(f => {
      if (f.field === 'valueCoding.code') {
        f.valueSetUrl = answerValueSetUrl;
      }
    })
  }
}
