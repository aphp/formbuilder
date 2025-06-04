/// <reference types="cypress" />

import {Util} from '../../../src/app/lib/util';
import {CypressUtil} from '../../support/cypress-util';


const olpExtUrl = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationLinkPeriod';
const observationExtractExtUrl = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract';
const ucumUrl = 'http://unitsofmeasure.org';

describe('Home page', () => {

  describe('Item level fields', () => {
    const helpTextExtension = [{
      url: Util.ITEM_CONTROL_EXT_URL,
      valueCodeableConcept: {
        text: 'Help-Button',
        coding: [{
          code: 'help',
          display: 'Help-Button',
          system: 'http://hl7.org/fhir/questionnaire-item-control'
        }]
      }
    }];

    beforeEach(() => {
      CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
      cy.loadHomePage();
      cy.openQuestionnaireFromScratch();
    });

    it('should import form with nested extensions', () => {
      const sampleFile = 'nested-extension-sample.json';
      let fixtureJson = null;
      cy.readFile('cypress/fixtures/' + sampleFile).should((json) => {
        fixtureJson = json
      });
      cy.clickImportFileBtn();
      cy.uploadFile(sampleFile, true);
      cy.get('#previewBtn').click();
      cy.contains('mat-dialog-actions button', 'Close').click();
      cy.questionnaireJSON().should((json) => {
        expect(json.item[0].extension[0].extension[0].extension[0].valueDecimal).to.equal(1.1);
        expect(json.item[0].extension[0].extension[1].extension[0].valueString).to.equal('Nested item: 1/2/1');
        expect(json.item[0].extension[0].extension[1].extension[1].valueString).to.equal('Nested item: 1/2/2');
        expect(json.extension[0].extension[0].extension[0].valueString).to.equal('Form level extension: 1/1/1');
        expect(json).to.deep.equal(fixtureJson);
      });
    });

    describe('Insert new item using sidebar tree node context menu', () => {
      beforeEach(() => {
        cy.getTreeNode('Item 0').as('contextNode');
        cy.get('@contextNode').find('span.node-display-prefix').should('have.text', '1');
        cy.get('@contextNode').find('button.dropdown-toggle').click();
      });

      afterEach(() => {
        cy.getTreeNode('New item 1').as('contextNode');
        cy.get('@contextNode').find('button.dropdown-toggle').click();
        cy.get('div.dropdown-menu.show').should('be.visible');
        cy.contains('button.dropdown-item', 'Remove this item').click({force: true});
        cy.contains('button', 'Yes').click();
      });

      it('should insert before context node using sidebar tree node context menu', () => {
        cy.contains('button.dropdown-item', 'Insert a new item before').click();
        cy.get('#text').should('have.value', 'New item 1');
        cy.getTreeNode('New item 1').find('span.node-display-prefix').should('have.text', '1');
      });

      it('should insert after context node using sidebar tree node context menu', () => {
        cy.contains('button.dropdown-item', 'Insert a new item after').click();
        cy.get('#text').should('have.value', 'New item 1');
        cy.getTreeNode('New item 1').find('span.node-display-prefix').should('have.text', '2');
      });

      it('should insert a child of context node using sidebar tree node context menu', () => {
        cy.contains('button.dropdown-item', 'Insert a new child item').click();
        cy.get('#text').should('have.value', 'New item 1');
        cy.getTreeNode('New item 1').find('span.node-display-prefix').should('have.text', '1.1');
      });
    });

    describe('Move context node using sidebar tree node context menu', () => {
      beforeEach(() => {
        cy.contains('button', 'Add new item').click();
        cy.contains('button', 'Add new item').click();
        cy.contains('button', 'Add new item').click();
        cy.getTreeNode('New item 1').as('node1');
        cy.getTreeNode('New item 2').as('node2');
        cy.getTreeNode('New item 3').as('node3');
        cy.getTreeNode('Item 0').click();

        cy.getTreeNode('Item 0').find('span.node-display-prefix').should('have.text', '1');
        cy.getTreeNode('New item 1').find('span.node-display-prefix').should('have.text', '2');
        cy.getTreeNode('New item 2').find('span.node-display-prefix').should('have.text', '3');
        cy.getTreeNode('New item 3').find('span.node-display-prefix').should('have.text', '4');

        cy.getTreeNode('Item 0').find('button.dropdown-toggle').click();
        cy.get('div.dropdown-menu.show').contains('button.dropdown-item', 'Move this item').click();
        cy.get('lfb-node-dialog').contains('button', 'Move').as('moveBtn');
        cy.get('@moveBtn').should('be.disabled');
        cy.get('lfb-node-dialog').find('#moveTarget1').click().type('{downarrow}{downarrow}{enter}');

      });

      afterEach(() => {
        cy.resetForm();
        cy.contains('button', 'Edit form attributes').click();
      });

      it('should move before a target node', () => {
        cy.get('input[type="radio"][value="AFTER"]').should('be.checked');
        cy.get('@moveBtn').should('not.be.disabled').click();
        cy.getTreeNode('New item 1').find('span.node-display-prefix').should('have.text', '1');
        cy.getTreeNode('New item 2').find('span.node-display-prefix').should('have.text', '2');
        cy.getTreeNode('Item 0').find('span.node-display-prefix').should('have.text', '3');
        cy.getTreeNode('New item 3').find('span.node-display-prefix').should('have.text', '4');
      });

      it('should move after a target node', () => {
        cy.get('input[type="radio"][value="BEFORE"]').click();
        cy.get('@moveBtn').should('not.be.disabled').click();
        cy.getTreeNode('New item 1').find('span.node-display-prefix').should('have.text', '1');
        cy.getTreeNode('Item 0').find('span.node-display-prefix').should('have.text', '2');
        cy.getTreeNode('New item 2').find('span.node-display-prefix').should('have.text', '3');
        cy.getTreeNode('New item 3').find('span.node-display-prefix').should('have.text', '4');
      });

      it('should move as a child of a target', () => {
        cy.get('input[type="radio"][value="CHILD"]').click();
        cy.get('@moveBtn').should('not.be.disabled').click();
        cy.getTreeNode('New item 1').find('span.node-display-prefix').should('have.text', '1');
        cy.getTreeNode('New item 2').find('span.node-display-prefix').should('have.text', '2');
        cy.getTreeNode('Item 0').find('span.node-display-prefix').should('have.text', '2.1');
        cy.getTreeNode('New item 3').find('span.node-display-prefix').should('have.text', '3');
      });
    });


    describe('Duplicate context node using sidebar tree node context menu', () => {
      beforeEach(() => {
        CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
        cy.loadHomePage();
        cy.openQuestionnaireFromScratch();

        cy.contains('button', 'Add new item').click();
        cy.contains('button', 'Add new item').click();
        cy.contains('button', 'Add new item').click();
        cy.getTreeNode('New item 1').as('node1');
        cy.getTreeNode('New item 2').as('node2');
        cy.getTreeNode('New item 3').as('node3');
        cy.getTreeNode('Item 0').click();

        // cy.getTreeNode('Item 0').find('span.node-display-prefix').should('have.text', '1');
        cy.getTreeNode('New item 1').find('span.node-display-prefix').should('have.text', '2');
        cy.getTreeNode('New item 2').find('span.node-display-prefix').should('have.text', '3');
        cy.getTreeNode('New item 3').find('span.node-display-prefix').should('have.text', '4');

        cy.getTreeNode('Item 0').find('button.dropdown-toggle').click();
        cy.get('div.dropdown-menu.show').contains('button.dropdown-item', 'Duplicate this item').click();
        cy.get('lfb-node-dialog').contains('button', 'Duplicate').as('copyBtn');
        cy.get('@copyBtn').should('be.disabled');
        cy.get('lfb-node-dialog').find('#moveTarget1').click().type('{downarrow}{downarrow}{enter}');

      });

      it('should copy before a target node', () => {
        cy.get('input[type="radio"][value="AFTER"]').should('be.checked');
        cy.get('@copyBtn').should('not.be.disabled').click();
        cy.getTreeNode('New item 1').find('span.node-display-prefix').should('have.text', '2');
        cy.getTreeNode('New item 2').find('span.node-display-prefix').should('have.text', '3');
        cy.getTreeNode('Copy of Item 0').find('span.node-display-prefix').should('have.text', '4');
        cy.getTreeNode('New item 3').find('span.node-display-prefix').should('have.text', '5');
      });

      it('should copy after a target node', () => {
        cy.get('input[type="radio"][value="BEFORE"]').click();
        cy.get('@copyBtn').should('not.be.disabled').click();
        cy.getTreeNode('Copy of Item 0').find('span.node-display-prefix').should('have.text', '3');
      });

      it('should copy as a child of a target', () => {
        cy.get('input[type="radio"][value="CHILD"]').click();
        cy.get('@copyBtn').should('not.be.disabled').click();
        cy.getTreeNode('Item 0').find('span.node-display-prefix').should('have.text', '1');
        cy.getTreeNode('New item 1').find('span.node-display-prefix').should('have.text', '2');
        cy.getTreeNode('New item 2').find('span.node-display-prefix').should('have.text', '3');
        cy.getTreeNode('New item 3').find('span.node-display-prefix').should('have.text', '4');
      });
    });
    it('should import help text item', () => {
      const helpTextFormFilename = 'help-text-sample.json';
      const helpString = 'testing help text from import';
      cy.clickImportFileBtn();
      cy.uploadFile(helpTextFormFilename, true);
      cy.get('[id^="__$helpText"]').should('have.value', helpString);
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].item[0].text).equal(helpString);
        expect(qJson.item[0].item[0].type).equal('display');
        expect(qJson.item[0].item[0].extension).to.deep.equal(helpTextExtension);
      });
    });

    it('should restrict to integer input in integer field', () => {
      cy.selectDataType('integer');
      cy.get('[id^="initialChoices_value"]').check({force: true});
      cy.get('[id^="initial.0.valueInteger"]').as('initIntField');
      cy.get('@initIntField').clear().type('abc').should('have.value', '');
      cy.get('@initIntField').clear().type('12abc').should('have.value', '12');
      cy.get('@initIntField').clear().type('3.4').should('have.value', '34');
      cy.get('@initIntField').clear().type('-5.6').should('have.value', '-56');
      cy.get('@initIntField').clear().type('-0').should('have.value', '-0');
      cy.get('@initIntField').clear().type('-2-4-').should('have.value', '-24');
      cy.get('@initIntField').clear().type('24e1').should('have.value', '241');
      cy.get('@initIntField').clear().type('-24E1').should('have.value', '-241');
    });

    it('should restrict to decimal input in number field', () => {
      cy.selectDataType('decimal');
      cy.get('[id^="initialChoices_value"]').check({force: true});
      cy.get('[id^="initial.0.valueDecimal"]').as('initNumberField');
      cy.get('@initNumberField').clear().type('abc').should('have.value', '');
      cy.get('@initNumberField').clear().type('12abc').should('have.value', '12');
      cy.get('@initNumberField').clear().type('3.4').should('have.value', '3.4');
      cy.get('@initNumberField').clear().type('-5.6').should('have.value', '-5.6');
      cy.get('@initNumberField').clear().type('-7.8ab').should('have.value', '-7.8');
      cy.get('@initNumberField').clear().type('-xy0.9ab').should('have.value', '-0.9');
    });

    it('should add answer-option', () => {
      cy.addAnswerOptions();
    });

    it('should add initial values', () => {
      cy.selectDataType('string');
      cy.get('[id^="initialChoices_value"]').check({force: true});
      cy.get('[id^="initial.0.valueString"]').type('initial string');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('string');
        expect(qJson.item[0].initial[0].valueString).equal('initial string');
      });
      cy.selectDataType('decimal');
      cy.get('[id^="initialChoices_value"]').check({force: true});
      cy.get('[id^="initial.0.valueDecimal"]').type('100.1');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('decimal');
        expect(qJson.item[0].initial[0].valueDecimal).equal(100.1);
      });

      cy.selectDataType('integer');
      cy.get('[id^="initialChoices_value"]').check({force: true});
      cy.get('[id^="initial.0.valueInteger"]').as('initialInteger');
      cy.get('@initialInteger').type('100');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('integer');
        expect(qJson.item[0].initial[0].valueDecimal).undefined;
        expect(qJson.item[0].initial[0].valueInteger).equal(100);
      });

      cy.get('@initialInteger').clear().type('1.1');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('integer');
        expect(qJson.item[0].initial[0].valueDecimal).undefined;
        expect(qJson.item[0].initial[0].valueInteger).not.undefined;
        // TODO -
        //  There is a bug in IntegerComponent, which moves the cursor to starting position
        // when '.' is entered, although
        // Refer to issue LF-2485.
        expect(qJson.item[0].initial[0].valueInteger).not.undefined;
      });

      cy.selectDataType('choice');
      cy.get('[id^="initialChoices_no"]').check({force: true});
      // cy.get('[id^="initial"]').should('not.be.visible');
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('choice');
        expect(qJson.item[0].initial).to.be.undefined;
      });

    });

    it('should fix a bug in messing up default selections when switched to another node', () => {
      const sampleFile = 'answer-option-sample.json';
      let fixtureJson;
      cy.readFile('cypress/fixtures/' + sampleFile).should((json) => {
        fixtureJson = json
      });
      cy.clickImportFileBtn();
      cy.uploadFile(sampleFile, true);
      cy.contains('button', 'Edit form attributes').click();
      cy.get('#title').should('have.value', 'Answer options form');
      cy.contains('button', 'Edit questions').click();
      cy.get('lfb-answer-option table > tbody > tr:nth-of-type(1)').as('firstOption')
        .find('[id^="radio_answerOption."]').as('firstRadioDefault');
      cy.get('lfb-answer-option table > tbody > tr:nth-of-type(2)').as('secondOption')
        .find('[id^="radio_answerOption."]').as('secondRadioDefault');

      // First item's default is second option
      cy.get('@secondRadioDefault').should('be.checked');
      // Switch to second item
      cy.clickTreeNode('Item 2 with answer option');
      cy.get('lfb-answer-option table > tbody > tr:nth-of-type(3)').as('thirdOption')
        .find('[id^="radio_answerOption."]').as('thirdRadioDefault');
      // Second item has no defaults
      cy.get('@firstRadioDefault').should('not.be.checked');
      cy.get('@secondRadioDefault').should('not.be.checked');
      cy.get('@thirdRadioDefault').should('not.be.checked');

      // Select first option in second item.
      cy.get('@firstRadioDefault').click();
      // Switch to first item
      cy.clickTreeNode('Item with answer option');
      // First item's default should be intact.
      cy.get('@secondRadioDefault').should('be.checked');
      // Switch to second item
      cy.clickTreeNode('Item 2 with answer option');
      // Second item's default is first option.
      cy.get('@firstRadioDefault').should('be.checked');
    });

    it('should create answerValueSet', () => {
      cy.selectDataType('choice');
      //cy.get('[id^="initialChoices_value"]').check({force: true});
      cy.get('[id^="__\\$answerOptionMethods_answer-option"]').should('be.checked');
      cy.get('[id^="__\\$answerOptionMethods_value-set"]').should('not.be.checked');
      cy.get('#answerValueSet_non-snomed').should('not.exist');
      cy.get('lfb-answer-option').should('be.visible');

      cy.get('[for^="__\\$answerOptionMethods_value-set"]').click();
      cy.get('#answerValueSet_non-snomed').should('be.visible');
      //cy.get('lfb-answer-option').should('not.exist');
      cy.get('#answerValueSet_non-snomed').clear().type('http://example.org');
      cy.questionnaireJSON().should((q) => {
        expect(q.item[0].answerValueSet).equal('http://example.org');
        expect(q.item[0].answerOption).to.be.undefined;
      });

      cy.get('[for^="__\\$answerOptionMethods_answer-option"]').click();
      cy.get('answerValueSet_non-snomed').should('not.exist');
      cy.get('lfb-answer-option').should('be.visible');
      const aOptions = [
        {display: 'display 1', code: 'c1', system: 's1'},
        {display: 'display 2', code: 'c2', system: 's2'}
      ];
      cy.enterAnswerOptions(aOptions);
      cy.questionnaireJSON().should((q) => {
        expect(q.item[0].answerValueSet).to.be.undefined;
        expect(q.item[0].answerOption[0].valueCoding).to.deep.equal(aOptions[0]);
        expect(q.item[0].answerOption[1].valueCoding).to.deep.equal(aOptions[1]);
      });
    });

    it('should import a form with an item having answerValueSet', () => {
      cy.clickImportFileBtn();
      cy.uploadFile('answer-value-set-sample.json', true);
      cy.contains('button', 'Edit form attributes').click();
      cy.get('#title').should('have.value', 'Answer value set form');
      cy.contains('button', 'Edit questions').click();
      cy.get('#type option:selected').should('have.text', 'choice');
      cy.get('[id^="__\\$answerOptionMethods_answer-option"]').should('not.be.checked');
      cy.get('[id^="__\\$answerOptionMethods_value-set"]').should('be.checked');
      // cy.get('lfb-answer-option').should('not.exist');
      cy.get('#answerValueSet_non-snomed').should('have.value', 'http://example.org');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].answerValueSet).to.equal('http://example.org');
      });
    });

    it('should import with item having item-control extension', () => {
      const icId = '#item_control___\\$itemControl';
      cy.clickImportFileBtn();
      cy.uploadFile('item-control-sample.json', true);
      cy.contains('button', 'Edit form attributes').click();
      cy.get('#title').should('have.value', 'Item control sample form');
      cy.contains('button', 'Edit questions').click();
      cy.get(icId).should('be.visible');
      cy.get(icId).should('be.checked');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('choice');
        expect(qJson.item[0].extension.length).equal(2);
        expect(qJson.item[0].extension[1].url)
          .equal('http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl');
        expect(qJson.item[0].extension[1].valueCodeableConcept.coding[0].code).equal('autocomplete');
        expect(qJson.item[0].extension[1].valueCodeableConcept.coding[0].display).equal('Auto-complete');
        expect(qJson.item[0].extension[1].valueCodeableConcept.coding[0].system)
          .equal('http://hl7.org/fhir/questionnaire-item-control');
      });

      cy.get(icId).click(); // Unchecked

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).equal('choice');
        expect(qJson.item[0].extension.length).equal(1);
        expect(qJson.item[0].extension[0].url)
          .equal('http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-preferredTerminologyServer');
        expect(qJson.item[0].extension[0].valueUrl).equal('https://snowstorm.ihtsdotools.org/fhir');
      });
    });

    it('should add restrictions', () => {
      cy.get('lfb-restrictions [for^="booleanControlled_Yes"]').click();

      cy.get('[id^="__$restrictions.0.operator"]').select('Maximum length');
      cy.get('[id^="__$restrictions.0.value"]').type('10');
      cy.contains('lfb-restrictions button', 'Add new restriction')
        .as('addRestrictionButton').click();
      cy.get('[id^="__$restrictions.1.operator"]').select('Minimum length');
      cy.get('[id^="__$restrictions.1.value"]').type('5');
      cy.get('@addRestrictionButton').click();
      cy.get('[id^="__$restrictions.2.operator"]').select('Regex pattern');
      cy.get('[id^="__$restrictions.2.value"]').type('xxx');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].maxLength).equal(10);
        expect(qJson.item[0].extension[0].url).equal('http://hl7.org/fhir/StructureDefinition/minLength');
        expect(qJson.item[0].extension[0].valueInteger).equal(5);
        expect(qJson.item[0].extension[1].url).equal('http://hl7.org/fhir/StructureDefinition/regex');
        expect(qJson.item[0].extension[1].valueString).equal('xxx');
      });
    });

    it('should import form with restrictions', () => {
      const sampleFile = 'restrictions-sample.json';
      let fixtureJson;
      cy.readFile('cypress/fixtures/' + sampleFile).should((json) => {
        fixtureJson = json
      });
      cy.uploadFile(sampleFile, true);
      cy.contains('button', 'Edit form attributes').click();
      cy.get('#title').should('have.value', 'Form with restrictions');
      cy.contains('button', 'Edit questions').click();
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0]).to.deep.equal(fixtureJson.item[0]);
      });
    });

    it('should import display type', () => {
      const sampleFile = 'group-display-type-sample.json';
      let fixtureJson;
      cy.readFile('cypress/fixtures/' + sampleFile).should((json) => {
        fixtureJson = json
      });
      cy.clickImportFileBtn();
      cy.uploadFile(sampleFile, true);
      cy.contains('button', 'Edit form attributes').click();
      cy.get('#title').should('have.value', 'New Form');
      cy.contains('button', 'Edit questions').click();
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].type).to.deep.equal(fixtureJson.item[0].type);
        expect(qJson.item[1].type).to.deep.equal(fixtureJson.item[1].type);
        expect(qJson.item[1].item[0].type).to.deep.equal(fixtureJson.item[1].item[0].type);
      });
    });

    it('should import quantity type', () => {
      const sampleFile = 'initial-quantity-sample.json';
      let fixtureJson;
      cy.readFile('cypress/fixtures/' + sampleFile).should((json) => {
        fixtureJson = json
      });
      cy.clickImportFileBtn();
      cy.uploadFile(sampleFile, true);
      cy.questionnaireJSON().should((qJson) => {
        delete qJson.item;
        delete fixtureJson.item;
        expect(qJson).to.deep.equal(fixtureJson);
      });
      cy.contains('button', 'Edit form attributes').click();
      cy.get('#title').should('have.value', 'Quantity Sample');
    });

    xit('should create quantity type with initial quantity unit', () => {
      cy.selectDataType('quantity');
      cy.get('[id^="initialChoices_value"]').check({force: true});
      cy.get('@type').contains('quantity');
      cy.get('[id^="initial.0.valueQuantity.value"]').as('value0').type('123');
      cy.get('[id^="initial.0.valueQuantity.unit"]')
        .as('unit0').type('f');
      cy.get('#searchResults').as('unitSuggestions').should('be.visible', true);
      cy.get('@unitSuggestions').find('table tbody tr:first').click();
      cy.get('@unitSuggestions').should('not.be.visible');
      cy.get('@unit0').should('have.value', 'farad');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].initial[0]).to.deep.equal({
          valueQuantity: {
            value: 123,
            unit: 'farad',
            code: 'F',
            system: 'http://unitsofmeasure.org'
          }
        });
      });

      cy.get('@unit0').clear().type('xxxx').blur().should('have.value', 'xxxx');

      // The blur() event may not be enough to update the form. Use some UI events to trigger the update.
      cy.get('#previewBtn').click();
      cy.contains('mat-dialog-actions button', 'Close').click();

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].initial[0]).to.deep.equal({
          valueQuantity: {
            value: 123,
            unit: 'xxxx'
          }
        });
      });

    });

    xdescribe('Item level fields: advanced', () => {
      beforeEach(() => {
        cy.advancedFields().click();
        cy.tsUrl().should('be.visible'); // Proof of advanced panel expansion
      });
      it('should support conditional display with answer coding source', () => {
        cy.addAnswerOptions();
        cy.contains('Add new item').scrollIntoView().click();
        cy.get('[id^="enableWhen.0.question"]').type('{downarrow}{enter}');
        cy.get('[id^="enableWhen.0.operator"]').select('=');
        cy.get('[id^="enableWhen.0.answerCoding"]').select('d1 (c1)');

        cy.questionnaireJSON().should((qJson) => {
          expect(qJson.item.length).equal(2);
          // Verify enableWhen construct.
          expect(qJson.item[1].enableWhen.length).equal(1);
          expect(qJson.item[1].enableWhen[0].question).equal(qJson.item[0].linkId);
          expect(qJson.item[1].enableWhen[0].operator).equal('=');
          expect(qJson.item[1].enableWhen[0].answerCoding.display).equal(qJson.item[0].answerOption[0].valueCoding.display);
          expect(qJson.item[1].enableWhen[0].answerCoding.code).equal(qJson.item[0].answerOption[0].valueCoding.code);
          expect(qJson.item[1].enableWhen[0].answerCoding.system).equal(qJson.item[0].answerOption[0].valueCoding.system);
        });
      });

      it('should display error message for invalid answer in conditional display', () => {
        cy.contains('Add new item').scrollIntoView().click();

        const errorMessageEl = 'mat-sidenav-content ul > li.text-danger.list-group-item-warning';
        const question1El = '[id^="enableWhen.0.question"]';
        const operator1El = '[id^="enableWhen.0.operator"]';
        const answer1El = '[id^="enableWhen.0.answer"]';
        const errorIcon1El = '[id^="enableWhen.0_err"]';
        const question2El = '[id^="enableWhen.1.question"]';
        const operator2El = '[id^="enableWhen.1.operator"]';
        const errorIcon2El = '[id^="enableWhen.1_err"]';

        cy.get(question1El).type('{downarrow}{enter}');
        cy.get(errorIcon1El).should('not.exist');
        cy.get(errorMessageEl).should('not.exist');

        cy.get(operator1El).select('=');
        cy.get(errorIcon1El).should('be.visible');
        cy.get(errorMessageEl).should('have.length', 2);
        cy.get(operator1El).select('Empty');
        cy.get(errorIcon1El).should('not.exist');
        cy.get(errorMessageEl).should('not.exist');

        cy.get(operator1El).select('>');
        cy.get(errorIcon1El).should('be.visible');
        cy.get(errorMessageEl).should('have.length', 2);
        cy.get(answer1El).type('1');
        cy.get(errorIcon1El).should('not.exist');
        cy.get(errorMessageEl).should('not.exist');

        cy.contains('button', 'Add another condition').click();

        cy.get(question2El).type('{downarrow}{enter}');
        cy.get(errorIcon2El).should('not.exist');
        cy.get(errorMessageEl).should('not.exist');
        cy.get(operator2El).select('<');
        cy.get(errorIcon2El).should('be.visible');
        cy.get(errorMessageEl).should('have.length', 2);
        cy.get('[id^="enableWhen.1_remove"]').click();
        cy.get(errorMessageEl).should('not.exist');

      });

      it('should display lforms errors in preview', () => {
        cy.clickImportFileBtn();
        const sampleFile = 'questionnaire-enableWhen-missing-linkId.json';
        cy.uploadFile(sampleFile, true);
        cy.get('#title').should('have.value', 'Questionnaire where enableWhen contains an invalid linkId');
        cy.contains('button', 'Edit questions').click();
        cy.contains('button', 'Preview').click();
        cy.get('wc-lhc-form').should('exist').parent().as('tabBody');
        cy.get('@tabBody').find('.card.bg-danger-subtle').should('be.visible');
        cy.contains('mat-dialog-actions button', 'Close').click();

        // Delete offending item and assert the error does not exist
        cy.getTreeNode('enableWhen item with an invalid linkId').click();
        cy.contains('button', 'Delete this item').click();
        cy.contains('lfb-confirm-dlg button', 'Yes').click();
        cy.contains('button', 'Preview').click();
        cy.get('wc-lhc-form').should('exist').parent().as('tabBody');
        cy.get('@tabBody').find('.card.bg-danger-subtle').should('not.exist');
        cy.contains('mat-dialog-actions button', 'Close').click();
      });

      it('should show answer column if there is an answer option in any row of conditional display', () => {
        cy.selectDataType('choice');
        cy.enterAnswerOptions([
          {display: 'display 1', code: 'c1', system: 's1', __$score: 1},
          {display: 'display 2', code: 'c2', system: 's2', __$score: 2}
        ]);
        cy.contains('Add new item').scrollIntoView().click();
        cy.get('#text').should('have.value', 'New item 1');
        cy.enterAnswerOptions([
          {display: 'display 1', code: 'c1', system: 's1', __$score: 1},
          {display: 'display 2', code: 'c2', system: 's2', __$score: 2},
          {display: 'display 3', code: 'c3', system: 's3', __$score: 3}
        ]);
        cy.contains('Add new item').scrollIntoView().click();
        cy.get('#text').should('have.value', 'New item 2');

        cy.get('[id^="enableWhen.0.question"]').as('r1Question').type('{enter}');
        cy.get('[id^="enableWhen.0.operator"]').as('r1Operator').select('Not empty');
        cy.get('[id^="enableWhen.0.answerCoding"]').should('not.exist');

        cy.contains('button', 'Add another condition').click();

        cy.get('[id^="enableWhen.1.question"]').as('r2Question').type('{downarrow}{enter}');
        cy.get('[id^="enableWhen.1.operator"]').as('r2Operator').select('=');
        cy.get('[id^="enableWhen.1.answerCoding"]').as('r2Answer').select('display 3 (c3)');

        cy.get('[id^="enableWhen.0.answerCoding"]').should('not.exist');

        cy.get('@r2Operator').select('Empty');
        cy.get('@r2Answer').should('not.exist');
        cy.get('@r1Operator').select('=');
        cy.get('[id^="enableWhen.0.answerCoding"]').as('r1Answer').should('be.visible');
        cy.get('@r1Answer').select('display 1 (c1)');
      });

      it('should show answer column if there is an answer in any row of conditional display', () => {
        cy.contains('Add new item').scrollIntoView().click();
        cy.get('#text').should('have.value', 'New item 1');

        const r1Question = '[id^="enableWhen.0.question"]';
        const r1Operator = '[id^="enableWhen.0.operator"]';
        const r1Answer = '[id^="enableWhen.0.answer"]';
        const r2Question = '[id^="enableWhen.1.question"]';
        const r2Operator = '[id^="enableWhen.1.operator"]';
        const r2Answer = '[id^="enableWhen.1.answer"]';
        // First row operator='exist'
        cy.get(r1Question).as('r1Question').type('{enter}');
        cy.get(r1Operator).as('r1Operator').select('Not empty');
        cy.get(r1Answer).should('not.exist');

        cy.contains('button', 'Add another condition').click();

        // Second row other than 'exist'
        cy.get(r2Question).type('{downarrow}{enter}');
        cy.get(r2Operator).select('=');
        cy.get(r2Answer).type('2');
        cy.get(r1Answer).should('not.exist');

        // Flip the first and second row operators
        cy.get(r1Operator).select('=');
        cy.get(r1Answer).type('1');
        cy.get(r2Answer).should('have.value', '2');

        cy.get(r2Operator).select('Empty');
        cy.get(r1Answer).should('have.value', '1');
        cy.get(r2Answer).should('not.exist');
      });

      it('should work with operator exists value conditional display', () => {
        // cy.selectDataType('choice');
        cy.enterAnswerOptions([
          {display: 'display 1', code: 'c1', system: 's1', __$score: 1},
          {display: 'display 2', code: 'c2', system: 's2', __$score: 2}
        ]);
        cy.contains('Add new item').scrollIntoView().click();
        cy.get('#text').should('have.value', 'New item 1');
        cy.enterAnswerOptions([
          {display: 'display 1', code: 'c1', system: 's1', __$score: 1},
          {display: 'display 2', code: 'c2', system: 's2', __$score: 2},
          {display: 'display 3', code: 'c3', system: 's3', __$score: 3}
        ]);
        cy.contains('Add new item').scrollIntoView().click();
        cy.get('#text').should('have.value', 'New item 2');

        cy.get('[id^="enableWhen.0.question"]').as('r1Question').type('{enter}');
        cy.get('[id^="enableWhen.0.operator"]').as('r1Operator').select('Not empty');

        cy.contains('button', 'Add another condition').click();

        cy.get('[id^="enableWhen.1.question"]').as('r2Question').type('{downarrow}{enter}');
        cy.get('[id^="enableWhen.1.operator"]').as('r2Operator').select('Empty');
        cy.get('@r2Operator').should('have.value', '1: notexists');

        cy.questionnaireJSON().should((json) => {
          expect(json.item[2].enableWhen).to.deep.equal([
            {
              question: json.item[0].linkId,
              operator: 'exists',
              answerBoolean: true
            },
            {
              question: json.item[1].linkId,
              operator: 'exists',
              answerBoolean: false
            }
          ]);
        });

      });

      it('should fix a bug showing answer field when source item is decimal and operator is other than exists', () => {
        cy.selectDataType('decimal');
        cy.contains('Add new item').scrollIntoView().click();
        cy.get('#text').should('have.value', 'New item 1');

        const r1Question = '[id^="enableWhen.0.question"]';
        const r1Operator = '[id^="enableWhen.0.operator"]';
        const r1Answer = '[id^="enableWhen.0.answer"]';
        const r1DecimalAnswer = '[id^="enableWhen.0.answerDecimal"]';
        const errorIcon1El = '[id^="enableWhen.0_err"]';
        // First row operator='exist'
        cy.get(r1Question).type('{enter}');
        cy.get(r1Operator).should('be.visible');
        cy.get(r1Answer).should('not.exist');
        cy.get(errorIcon1El).should('not.exist');

        cy.get(r1Operator).select('>');
        cy.get(r1DecimalAnswer).should('be.visible');
        cy.get(errorIcon1El).should('be.visible');
        cy.get(r1DecimalAnswer).type('2.3');
        cy.get(errorIcon1El).should('not.exist');
      });

      it('should create observation link period', () => {
        // Yes/no option
        cy.get('[id^="radio_No_observationLinkPeriod"]').as('olpNo');
        cy.get('[id^="radio_Yes_observationLinkPeriod"]').as('olpYes');
        cy.get('@olpNo').should('be.visible').should('be.checked');
        cy.get('@olpYes').should('be.visible').should('not.be.checked');
        cy.get('[for^="radio_Yes_observationLinkPeriod"]').click();
        // Code missing message.
        cy.get('lfb-observation-link-period > div > div > div > p').as('olpMsg')
          .should('contain.text', 'Linking to FHIR Observation');
        cy.get('[id^="observationLinkPeriod"]').should('not.exist');
        cy.get('@codeYes').click();
        cy.get('[id^="code.0.code"]').type('C1');
        cy.get('@olpMsg').should('not.exist');
        cy.get('[id^="observationLinkPeriod"]').as('timeWindow')
          .should('exist').should('be.visible');
        // Time window input.
        cy.get('@timeWindow').type('2');
        // Unit selection.
        cy.get('[id^="select_observationLinkPeriod"] option:selected').should('have.text', 'years');
        cy.get('[id^="select_observationLinkPeriod"]').select('months');

        cy.questionnaireJSON().should((qJson) => {
          expect(qJson.item[0].code[0].code).to.equal('C1');
          expect(qJson.item[0].extension[0]).to.deep.equal({
            url: olpExtUrl,
            valueDuration: {
              value: 2,
              unit: 'months',
              system: ucumUrl,
              code: 'mo'
            }
          });
        });
      });

      it('should import item with observation link period extension', () => {
        // Display of time window when item with extension is imported.
        const sampleFile = 'olp-sample.json';
        let fixtureJson, originalExtension;
        cy.readFile('cypress/fixtures/' + sampleFile).should((json) => {
          fixtureJson = json;
          originalExtension = JSON.parse(JSON.stringify(json.item[0].extension));
        });
        cy.clickImportFileBtn();
        cy.uploadFile(sampleFile, false);
        cy.get('#title').should('have.value', 'Form with observation link period');
        cy.contains('button', 'Edit questions').click();
        cy.advancedFields().click();
        cy.get('@codeYesRadio').should('be.checked');
        cy.get('[id^="code.0.code"]').should('have.value', 'Code1');
        cy.get('[id^="observationLinkPeriod"]').as('timeWindow')
          .should('exist')
          .should('be.visible')
          .should('have.value', '200');
        // Unit selection.
        cy.get('[id^="select_observationLinkPeriod"] option:selected').should('have.text', 'days');

        cy.questionnaireJSON().should((qJson) => {
          delete qJson.item;
          delete fixtureJson.item;
          expect(qJson).to.deep.equal(fixtureJson);
        });

        // Remove
        cy.get('@timeWindow').clear().blur();
        cy.questionnaireJSON().should((qJson) => {
          expect(qJson.item[0].extension.length).to.equal(2); // Other than olp extension.
          const extExists = qJson.item[0].extension.some((ext) => {
            return ext.url === olpExtUrl;
          });
          expect(extExists).to.equal(false);
        });

      });

      describe('Use FHIR Observation extraction?', () => {

        it('should create observation extraction', () => {
          // Yes/no option
          cy.get('[for^="radio_No_observationExtract"]').as('oeNoLabel');
          cy.get('[for^="radio_Yes_observationExtract"]').as('oeYesLabel').click();
          // Code missing message.
          cy.get('lfb-observation-extract p').as('warningMsg')
            .should('contain.text', 'Extraction to FHIR Observations requires');
          cy.get('@oeNoLabel').click();
          cy.get('@warningMsg').should('not.exist');
          cy.get('@oeYesLabel').click();
          cy.get('@warningMsg').should('be.visible');
          cy.get('@codeYes').click();
          cy.get('[id^="code.0.code"]').type('C1');
          cy.get('@warningMsg').should('not.exist');
          cy.get('[id^="code.0.code"]').clear();
          cy.get('@warningMsg').should('be.visible');
          cy.get('[id^="code.0.code"]').type('C1');
          cy.get('@warningMsg').should('not.exist');

          cy.questionnaireJSON().should((qJson) => {
            expect(qJson.item[0].code[0].code).to.equal('C1');
            expect(qJson.item[0].extension[0]).to.deep.equal({
              url: observationExtractExtUrl,
              valueBoolean: true
            });
          });

          cy.get('@oeNoLabel').click();
          cy.questionnaireJSON().should((qJson) => {
            expect(qJson.item[0].code[0].code).to.equal('C1');
            expect(qJson.item[0].extension).to.be.undefined;
          });
        });

        it('should import item with observation-extract extension', () => {
          const sampleFile = 'observation-extract.json';
          let fixtureJson, originalExtension;
          cy.readFile('cypress/fixtures/' + sampleFile).should((json) => {
            fixtureJson = json;
            originalExtension = JSON.parse(JSON.stringify(json.item[0].extension));
          });
          cy.clickImportFileBtn();
          cy.uploadFile(sampleFile, false);
          cy.get('#title').should('have.value', 'Form with observation extract');
          cy.contains('button', 'Edit questions').click();
          cy.advancedFields().click();
          cy.get('@codeYesRadio').should('be.checked');
          cy.get('[id^="code.0.code"]').should('have.value', 'Code1');

          cy.get('[id^="radio_Yes_observationExtract"]').should('be.checked');

          cy.questionnaireJSON().should((qJson) => {
            delete qJson.item;
            delete fixtureJson.item;
            expect(qJson).to.deep.equal(fixtureJson);
          });

          // Remove
          cy.get('[for^="radio_No_observationExtract"]').click();
          cy.questionnaireJSON().should((qJson) => {
            expect(qJson.item[0].extension.length).to.equal(2); // Other than oe extension.
            const extExists = qJson.item[0].extension.some((ext) => {
              return ext.url === observationExtractExtUrl;
            });
            expect(extExists).to.equal(false);
          });
        });
      });
    });
  });

  describe('Test descendant items and display/group type changes', () => {
    beforeEach(() => {
      CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
      const sampleFile = 'USSG-family-portrait.json';
      let fixtureJson;
      cy.readFile('cypress/fixtures/' + sampleFile).should((json) => {
        fixtureJson = json
      });
      cy.loadHomePage();
      cy.clickImportFileBtn();
      cy.uploadFile(sampleFile, true);
      cy.contains('button', 'Edit form attributes').click();
      cy.get('#title').should('have.value', 'US Surgeon General family health portrait');
      cy.contains('button', 'Edit questions').click();
    });

    xit('should preserve descendant item array', () => {
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].item[10].item.length).to.equal(2);
      });
    });

    xit('should preserve change of datatype display', () => {
      cy.toggleTreeNodeExpansion('My health history');
      cy.getTreeNode('Name').click({multiple: true});
      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].item[0].text).to.equal('Name');
        expect(qJson.item[0].item[0].type).to.equal('string');
      });
      cy.get('#text').clear().type('xxx');
      cy.get('#type').select('header (group/display)');

      cy.clickTreeNode('My health history');
      cy.getTreeNode('xxx').click({force: true}); // Force through tooltip.
      cy.get('#text').should('have.value', 'xxx');
      cy.get('#type').should('have.value', '14: group');

      cy.questionnaireJSON().should((qJson) => {
        expect(qJson.item[0].item[0].text).to.equal('Name');
        expect(qJson.item[0].item[0].type).to.equal('string');
      });
    });
  });
});

describe('Questionnaire create dialog', () => {

  beforeEach(() => {
    CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
    cy.loadHomePage();
    cy.get('button').contains('+').click();
    cy.get("#questionnaire-create-dlg")
      .find('.modal-title')
      .should('have.text', 'Create Questionnaire');
    cy.contains('button', 'Create').as('addNewItem');

  });

  it('fills title and mocks backend id check', () => {
    cy.get('input#title').type('Test Form');
    cy.get('input#id').should('have.value', 'TestForm');
    cy.contains('id is available.').should('be.visible');
    cy.contains('button', 'Create').should('not.be.disabled').click();
  });
});


describe('Advanced options', () => {
  beforeEach(() => {

    CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
    cy.loadHomePage();
    cy.clickImportFileBtn();
  });

  it('should duplicate the old Questionnaire', () => {
    cy.uploadFile('reset-form.json');

    cy.clickDuplicateBtn();

    cy.get('.modal-dialog').should('be.visible');

    cy.get('input#title').type('Test Form');
    cy.get('input#id').should('have.value', 'TestForm');
    cy.contains('id is available.').should('be.visible');
    cy.contains('button', 'Create').should('not.be.disabled').click();


  });

});


xdescribe('Effective Period field', () => {
  beforeEach(() => {

    CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
    cy.loadHomePage();
    cy.clickImportFileBtn();

  });
  it('should import with item having effective period property', () => {
    cy.clickImportFileBtn();
    cy.uploadFile('effective-period-and-answer-expression-sample.json');
    cy.contains('button', 'Edit form attributes').click();
    cy.get('#title').should('have.value', 'effective period and answer expression sample');

    const startDate = '2021-06-30T03:02:01';
    const oldDate = '2024-01-17T07:03:02';
    cy.questionnaireJSON().should((qJson) => {
      expect(qJson.effectivePeriod.start).equal(startDate);
      expect(qJson.effectivePeriod.end).equal(oldDate);
    });
    cy.get('input[name="effectivePeriod.start"]').should('be.visible').should('have.value', '2021-06-30 03:02:01');
    cy.get('input[name="effectivePeriod.end"]').should('be.visible').should('have.value', '2024-01-17 07:03:02');
  });

});

describe('Answer expression field for choice item', () => {
  beforeEach(() => {

    CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
    cy.loadHomePage();
    cy.clickImportFileBtn();
  });
  it('should import form with choice item having answer expression extension', () => {
    cy.uploadFile('effective-period-and-answer-expression-sample.json');
    cy.contains('button', 'Edit form attributes').click();
    cy.get('#title').should('have.value', 'effective period and answer expression sample');

    cy.contains('button', 'Edit questions').click();
    cy.get('[id^="__\\$answerOptionMethods_answer-expression"]').should('be.visible').should('be.checked');

    cy.get('[id^="__\\$answerExpression.0.description"]').should('be.visible').should('have.value', 'test_description');
    cy.get('[id^="__\\$answerExpression.0.expression"]').should('be.visible').should('have.value', 'test_expression');

    cy.questionnaireJSON().should((qJson) => {
      expect(qJson.item[0].type).equal('choice');
      expect(qJson.item[0].extension.length).equal(1);
      expect(qJson.item[0].extension[0].url)
        .equal('http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerExpression');
      const valueExpression = qJson.item[0].extension[0].valueExpression;
      expect(valueExpression.description).equal('test_description');
      expect(valueExpression.expression).equal('test_expression');
      expect(valueExpression.language).equal('text/fhirpath');
    });

    const newDescription = 'newDescription';
    const newExpression = 'newExpression';
    cy.get('[id^="__\\$answerExpression.0.description"]').clear().type(newDescription).should('be.visible').should('have.value', newDescription);
    cy.get('[id^="__\\$answerExpression.0.expression"]').clear().type(newExpression).should('be.visible').should('have.value', newExpression);


    cy.questionnaireJSON().should((qJson) => {
      expect(qJson.item[0].type).equal('choice');
      expect(qJson.item[0].extension.length).equal(1);
      expect(qJson.item[0].extension[0].url)
        .equal('http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerExpression');
      const valueExpression = qJson.item[0].extension[0].valueExpression;
      expect(valueExpression.description).equal(newDescription);
      expect(valueExpression.expression).equal(newExpression);
      expect(valueExpression.language).equal('text/fhirpath');
    });
  });

  it('should import form with string item having calculated expression extension', () => {
    cy.uploadFile('calculated-expression-sample.json', false);
    cy.contains('button', 'Edit form attributes').click();
    cy.get('#title').should('have.value', 'calculated expression sample');
    cy.contains('button', 'Edit questions').click();
    cy.advancedFields().click();
    cy.get('[id^="initialChoices_true"]').should('be.visible').should('be.checked');
    cy.get('[id^="__\\$calculatedExpression.0.description"]').should('be.visible').should('have.value', 'test_description');
    cy.get('[id^="__\\$calculatedExpression.0.expression"]').should('be.visible').should('have.value', 'test_expression');

    cy.questionnaireJSON().should((qJson) => {
      expect(qJson.item[0].type).equal('string');
      expect(qJson.item[0].extension.length).equal(1);
      expect(qJson.item[0].extension[0].url)
        .equal('http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression');
      const valueExpression = qJson.item[0].extension[0].valueExpression;
      expect(valueExpression.description).equal('test_description');
      expect(valueExpression.expression).equal('test_expression');
    });

    const newName = 'newName';
    const newExpression = 'newExpression';
    cy.get('[id^="__\\$calculatedExpression.0.description"]').clear().type(newName).should('be.visible').should('have.value', newName);
    cy.get('[id^="__\\$calculatedExpression.0.expression"]').clear().type(newExpression).should('be.visible').should('have.value', newExpression);


    cy.questionnaireJSON().should((qJson) => {
      expect(qJson.item[0].type).equal('string');
      expect(qJson.item[0].extension.length).equal(1);
      expect(qJson.item[0].extension[0].url)
        .equal('http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression');
      const valueExpression = qJson.item[0].extension[0].valueExpression;
      expect(valueExpression.description).equal(newName);
      expect(valueExpression.expression).equal(newExpression);
    });
  });


  it('should import form with string item having questionnaire source item extensions', () => {
    cy.uploadFile('questionnaire-source-item.json');
    cy.contains('button', 'Edit form attributes').click();
    cy.get('#title').should('have.value', 'questionnaire source item extensions sample');
    cy.contains('button', 'Edit questions').click();
    cy.advancedFields().click();
    cy.get('[id^="__\\$questionnaireItemSource.0.comment"]').should('be.visible').should('have.value', 'comment 1');
    cy.get('[id^="__\\$questionnaireItemSource.1.comment"]').should('be.visible').should('have.value', 'comment 2');
   // cy.get('[id^="select__\\$questionnaireItemSource.0"]').get('#type option:selected').should('have.text', 'string');

    cy.questionnaireJSON().should((qJson) => {
      expect(qJson.item[0].type).equal('string');
      expect(qJson.item[0].extension.length).equal(2);
      expect(qJson.item[0].extension[0].url)
        .equal('https://aphp.fr/ig/fhir/formbuilder/StructureDefinition/QuestionnaireItemSource');
      const sourceExtension = qJson.item[0].extension[0].extension[0];
      expect(sourceExtension.url).equal('source');
      expect(sourceExtension.valueUri).equal('https://aphp.fr/ig/fhir/eds/Endpoint/form-builder');
      const commentExtension = qJson.item[0].extension[0].extension[1];
      expect(commentExtension.url).equal('comment');
      expect(commentExtension.valueString).equal('comment 1');
    });
  });

});


describe('Hidden extension for hidden item', () => {
  beforeEach(() => {

    CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
    cy.loadHomePage();
    cy.clickImportFileBtn();

  });
  it('should import form having hidden extension', () => {
    cy.uploadFile('hidden-item-sample.json', false);
    cy.contains('button', 'Edit form attributes').click();
    cy.get('#title').should('have.value', 'Hospitalisation obstétrique');
    cy.contains('button', 'Edit questions').click();
    cy.get('#text').should('have.value', 'Admission');
    cy.advancedFields().click();
    cy.get('[id^="booleanRadioHidden_true"]').should('be.visible').should('be.checked');

    cy.questionnaireJSON().should((qJson) => {
      expect(qJson.item[0].text).equal('Admission');
      expect(qJson.item[0].extension[0].url)
        .equal('http://hl7.org/fhir/StructureDefinition/questionnaire-hidden');
      expect(qJson.item[0].extension[0].valueBoolean).equal(true);

      expect(qJson.item[1].item[0].item[1].item[0].text).equal('Identité');
      expect(qJson.item[0].extension[0].url)
        .equal('http://hl7.org/fhir/StructureDefinition/questionnaire-hidden');
      expect(qJson.item[0].extension[0].valueBoolean).equal(true);

      expect(qJson.item[1].item[0].item[1].item[0].item[0].text).equal('Prénom');
      expect(qJson.item[1].item[0].item[1].item[0].item[0].extension)
        .equal(undefined);

      expect(qJson.item[1].item[0].item[1].item[0].item[1].text).equal('Sexe');
      expect(qJson.item[1].item[0].item[1].item[0].item[1].extension)
        .equal(undefined);

    });

    cy.get('#text').should('have.value', 'Admission');
    cy.get('label[for^="booleanRadioHidden_false"]').should('be.visible').click();

    cy.questionnaireJSON().should((qJson) => {
      expect(qJson.item[0].text).equal('Admission');
      expect(qJson.item[0].extension).equal(undefined);
    });

  });

});


describe('item with initial', () => {
  beforeEach(() => {

    CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
    cy.loadHomePage();
  });

  it('should import form having InitialExpression extension', () => {
    cy.clickImportFileBtn();

    cy.uploadFile('initial-expression-extension.json', false);
    cy.contains('button', 'Edit form attributes').click();
    cy.get('#title').should('have.value', 'Item with initial expression extension');
    cy.contains('button', 'Edit questions').click();

    cy.get('[id^="initialChoices_expression"]').should('be.visible').should('be.checked');
    cy.questionnaireJSON().should((qJson) => {
      const ext = qJson.item[0].extension[0];
      expect(qJson.item[0].text).equal('Origine géographique');
      expect(ext.url).equal('http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression')
      const valueExpressionResult = {
        "description": "prend la valeur de l'origine géographique V2 si elle existe, sinon V1",
        "language": "text/fhirpath",
        "expression": "%OrigineGeographiqueMere"
      };

      expect(ext.valueExpression.description).equal(valueExpressionResult.description);
      expect(ext.valueExpression.language).equal(valueExpressionResult.language);
      expect(ext.valueExpression.expression).equal(valueExpressionResult.expression);

    });

  });

  it('should have initial value for choice item with answerValueSet', () => {

    cy.openQuestionnaireFromScratch();

    cy.selectDataType('choice');

    cy.get('[id^="__\\$answerOptionMethods_answer-option"]')
      .should('exist')
      .and('be.checked');

    cy.get('[id^="__\\$answerOptionMethods_value-set"]').should('not.be.checked');
    cy.get('lfb-answer-option').should('be.visible');

    cy.get('[for^="__\\$answerOptionMethods_value-set"]').click();
    cy.get('#answerValueSet_non-snomed').should('be.visible');
    cy.get('#answerValueSet_non-snomed').should('have.value', 'TO DO');

    cy.get('[id^="initialChoices_no"]').should('be.visible').should('be.checked');

  });
});
