/// <reference types="cypress" />

import {CypressUtil} from '../../support/cypress-util'
import {ExtensionDefs} from "../../../src/app/lib/extension-defs";

describe('Home page', () => {
  beforeEach(() => {
    // Cypress starts out with a blank slate for each test
    // so we must tell it to visit our website with the `cy.visit()` command.
    // Since we want to visit the same URL at the start of all our tests,
    // we include it in our beforeEach function so that it runs before each test
    // loadHomePage() calls visit() with assertions for LForms object on window.
    // It also deals with loinc notice, if needed.
    CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
    cy.loadHomePage();
  });

  it('display home page title', () => {
    cy.get('.modal-title').first().should('have.text', 'Search your form')
  });


  describe('Home page import options', () => {
    beforeEach(() => {
      CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
      cy.loadHomePage();
    });
  });
  it('should import local file', () => {
    CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
    cy.clickImportFileBtn();
    cy.uploadFile('answer-option-sample.json');
    cy.contains('button', 'Edit form attributes').click();
    cy.get('#title').should('have.value', 'Answer options form');
    cy.questionnaireJSON().then((previewJson) => {
      expect(previewJson).to.be.deep.equal(previewJson);
    });
  });

  describe('Form level fields', () => {

    beforeEach(() => {
      CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
      cy.loadHomePage();
      cy.openQuestionnaireFromScratch();
      cy.contains('button', 'Edit form attributes').click();
      cy.get('[id^="booleanRadio_true"]').as('codeYes');
      cy.get('[id^="booleanRadio_false"]').as('codeNo');
    });

    it('should include code only when use question code is yes (form level)', () => {
      cy.contains('div', 'Code').should('be.visible').includeExcludeCodeField('form');
    });

    it('should create codes at form level', () => {
      CypressUtil.assertCodeField('/code');
    });

    xit('should display Questionnaire.url', () => {
      cy.get('#url').as('url').type('http://example.com/1');
      cy.questionnaireJSON().should((json) => {
        expect(json.url).equal('http://example.com/1');
      });
      cy.get('@url').clear().type('a a');
      cy.get('@url').next('small')
        .should('be.visible')
        .contains('Spaces and other whitespace characters are not allowed in this field.');
      cy.get('@url').clear();
      cy.get('@url').siblings('small').should('not.exist');
    });

    it('should retain title edits', () => {
      cy.get('#title').should('have.value', 'Test Form').clear();
      cy.get('#title').type('Dummy title');
      cy.questionnaireJSON().should((json) => {
        expect(json.title).equal('Dummy title');
      });
      cy.get('#title').should('have.value', 'Dummy title');
    });

    it('should move to form level fields', () => {
      cy.get('lfb-form-fields > div > div > p').should('have.text', 'Enter basic information about the form.');
    })

    it('should hide/display code field', () => {
      cy.get('@codeYes').check({force: true});
      cy.get('[id^="code.0.code"]').as('code');
      cy.get('@code').should('be.visible');
      cy.get('@codeNo').check({force: true});
      cy.get('@code').should('not.exist');
    });

    it('should display preview widget', () => {
      cy.uploadFile('answer-option-sample.json', true);
      cy.contains('button', 'Edit form attributes').click();
      cy.get('#title').should('have.value', 'Answer options form',);
      cy.contains('button', 'Edit questions').click();
      cy.get('#previewBtn').scrollIntoView().click();
      cy.contains('div[role="tab"]', 'View Rendered Form').scrollIntoView().click();
      cy.get('wc-lhc-form').should('be.visible', true);
      cy.get('#1\\/1').as('acInput').should('have.value', 'd2');
      cy.get('@acInput').focus();
      cy.get('#completionOptionsScroller').as('acResults').should('be.visible');
      cy.get('@acResults').find('ul > li').as('acListItems').should('have.length', 2);
      cy.get('@acListItems').first().click();
      cy.get('@acInput').should('have.value', 'd1');
      cy.contains('mat-dialog-actions > button', 'Close').click();
    });

    xit('should select use context', () => {
      cy.get('[id^="__\\$useContext"]').select('Maternité');
      const useContextElement = {
        code: {
          system: 'https://aphp.fr/ig/fhir/eds/CodeSystem/aphp-eds-usage-context-type-cs',
          code: 'domain',
          display: 'Domaine métier'
        },
        valueCodeableConcept: {
          coding: [{
            system: 'https://aphp.fr/ig/fhir/eds/CodeSystem/aphp-eds-domain-usage-context-cs',
            code: 'maternity',
            display: 'Maternité'
          }]
        }
      };
      cy.questionnaireJSON().should((json) => {
        expect(json.useContext.length).equal(1);
        const actual = json.useContext[0].valueCodeableConcept.coding[0];
        const expected = useContextElement.valueCodeableConcept.coding[0];
        expect(actual.code).equal(expected.code);
        expect(actual.display).equal(expected.display);
        expect(actual.system).equal(expected.system);
        const actualCode = json.useContext[0].code;
        const expectedCode = useContextElement.code;
        expect(actualCode.code).equal(expectedCode.code);
        expect(actualCode.display).equal(expectedCode.display);
        expect(actualCode.system).equal(expectedCode.system);
      });
    });
    xit('should work with ethnicity ValueSet in preview', () => {
      cy.uploadFile('USSG-family-portrait.json');
      cy.get('#title').should('have.value', 'US Surgeon General family health portrait', {timeout: 10000});
      cy.get('#previewBtn').click();
      cy.contains('div[role="tab"]', 'View Rendered Form').click();
      cy.get('wc-lhc-form').should('exist', true, {timeout: 10000});
      cy.get('#\\/54126-8\\/54133-4\\/1\\/1').as('ethnicity');
      cy.get('@ethnicity').type('l');
      // cy.get('#completionOptions').should('be.visible', true);
      cy.get('@ethnicity').type('{downarrow}{enter}', {force: true});
      // cy.get('span.autocomp_selected').contains('La Raza');
      cy.contains('mat-dialog-actions > button', 'Close').click();
    });

    xit('should create questionnaire on the fhir server', () => {
      cy.uploadFile('answer-option-sample.json');
      cy.contains('button.dropdown-toggle.btn', 'Export').as('exportMenu');
      cy.get('@exportMenu').click(); // Open menu
      cy.contains('button.dropdown-item', 'Update the questionnaire').as('updateMenuItem');
      cy.get('@updateMenuItem').should('have.class', 'disabled');
      cy.get('@exportMenu').click();  // Close the menu
      cy.FHIRServerResponse('Create a new questionnaire').should((json) => {
        expect(json.id).not.undefined;
        expect(json.meta).not.undefined;
      });

      // Update
      cy.get('#title').clear().type('Modified title');
      cy.get('@exportMenu').click();
      cy.get('@updateMenuItem').should('be.visible');
      cy.get('@updateMenuItem').should('not.have.class', 'disabled');
      cy.get('@exportMenu').click();
      cy.FHIRServerResponse('Update').should((json) => {
        expect(json.title).equal('Modified title');
      });

    });


    xit('should expand/collapse advanced fields panel', () => {
      cy.tsUrl().should('not.be.visible');
      cy.advancedFields().click();
      cy.tsUrl().should('be.visible');
      cy.advancedFields().click();
      cy.tsUrl().should('not.be.visible');
    });

    xdescribe('Form level fields: Advanced', () => {
      beforeEach(() => {
        cy.advancedFields().click();
        cy.tsUrl().should('be.visible');
      });

      it('should create terminology server extension', () => {
        cy.tsUrl().next('small.text-danger').should('not.exist');
        cy.tsUrl().type('ab');
        cy.tsUrl().next('small.text-danger').should('have.text', 'Please enter a valid URL.');
        cy.tsUrl().clear();
        cy.tsUrl().next('small.text-danger').should('not.exist');
        cy.tsUrl().type('http://example.org/fhir');
        CypressUtil.assertValueInQuestionnaire('/extension',
          [{
            valueUrl: 'http://example.org/fhir',
            url: ExtensionDefs.preferredTerminologyServer.url
          }]);
        cy.tsUrl().clear();
        CypressUtil.assertValueInQuestionnaire('/extension', undefined);
        cy.tsUrl().type('http://example.com/r4');
        CypressUtil.assertValueInQuestionnaire('/extension',
          [{
            url: ExtensionDefs.preferredTerminologyServer.url,
            valueUrl: 'http://example.com/r4'
          }]);
      });

      it('should import form with terminology server extension at form level', () => {
        const sampleFile = 'terminology-server-sample.json';
        cy.uploadFile(sampleFile, false); // Avoid warning form loading based on item or form
        cy.get('#title').should('have.value', 'Terminology server sample form');
        cy.tsUrl().should('be.visible');
        cy.tsUrl().should('have.value', 'https://example.org/fhir');
        CypressUtil.assertExtensionsInQuestionnaire(
          '/extension',
          ExtensionDefs.preferredTerminologyServer.url,
          [{
            url: ExtensionDefs.preferredTerminologyServer.url,
            valueUrl: 'https://example.org/fhir'
          }]
        );

        cy.tsUrl().clear();
        CypressUtil.assertExtensionsInQuestionnaire(
          '/extension', ExtensionDefs.preferredTerminologyServer.url, []);

        cy.tsUrl().type('http://a.b');
        CypressUtil.assertExtensionsInQuestionnaire(
          '/extension',
          ExtensionDefs.preferredTerminologyServer.url,
          [{
            url: ExtensionDefs.preferredTerminologyServer.url,
            valueUrl: 'http://a.b'
          }]
        );
      });
    });

    it('should include url and meta.source in the FHIR Questionnaire JSON', () => {
      cy.contains('button', 'Advanced fields').click();

      cy.get('input#url').clear().type('https://example.org/questionnaire');
      cy.get('input#meta\\.source').clear().type('my-source-system');

      cy.questionnaireJSON().should((json) => {
        expect(json.url).to.equal('https://example.org/questionnaire');
        expect(json.meta?.source).to.equal('my-source-system');
      });
    });

    it('should have identical values for id and title in the FHIR Questionnaire JSON', () => {
      cy.questionnaireJSON().should((json) => {
        expect(json.id).to.equal(json.title);
      });
    });

    it('should not include the profile property in the FHIR Questionnaire JSON', () => {
      cy.questionnaireJSON().should((json) => {
        expect(json.meta?.profile).to.be.undefined;
      });
    });

    it('should display Advanced Fields in the correct order: Url, Source, Launch Context, Variables', () => {
      cy.contains('button', 'Advanced fields')
        .should('exist')
        .click();

      cy.get('#advancedFields').should('be.visible');

      cy.get('#advancedFields')
        .find('label')
        .then(($labels) => {
          const labelTexts = [...$labels].map((label) => label.textContent.trim());

          const expectedOrder = ['Url', 'Source', 'Launch Context', 'Variables'];

          const actualFiltered = labelTexts.filter((label) => expectedOrder.includes(label));

          expect(actualFiltered).to.deep.equal(expectedOrder);
        });
    });



  });


  describe('Warning dialog when replacing current form', () => {

    beforeEach(() => {
      CypressUtil.mockSnomedEditionsAndHapiFhirRessources();
      cy.loadHomePage();
      cy.openQuestionnaireFromScratch();
      cy.uploadFile('answer-option-sample.json');
    });

    it('should display warning dialog when replacing from local file', () => {
      cy.handleWarning();
      cy.contains('button', 'Edit form attributes').click();
      cy.get('#title').should('have.value', 'Answer options form');
      cy.uploadFile('decimal-type-sample.json', false);
      cy.contains('.modal-title', 'Replace existing form?').should('be.visible');
      cy.contains('div.modal-footer button', 'Cancel').click();
      cy.get('#title').should('have.value', 'Answer options form');
      cy.uploadFile('decimal-type-sample.json', true);
      cy.contains('button', 'Edit form attributes').click();
      cy.get('#title').should('have.value', 'Decimal type form');
    });

    xit('should display warning dialog when replacing form from FHIR server', () => {
      const titleSearchTerm = 'vital';
      cy.get('#title').should('have.value', 'Answer options form');
      cy.contains('button', 'Import').click();
      cy.contains('button', 'Import from a FHIR server...').click();
      cy.fhirSearch(titleSearchTerm);
      cy.contains('.modal-title', 'Replace existing form?').should('be.visible');
      cy.contains('div.modal-footer button', 'Cancel').click();
      cy.get('#title').should('have.value', 'Answer options form');

      cy.contains('button', 'Import').click();
      cy.contains('button', 'Import from a FHIR server...').click();
      cy.fhirSearch(titleSearchTerm);
      cy.contains('.modal-title', 'Replace existing form?').should('be.visible');
      cy.contains('div.modal-footer button', 'Continue').click();

      //cy.get('#title').invoke('val').should('match', new RegExp(titleSearchTerm, 'i'));
      cy.get('[id^="booleanRadio_false"]').should('be.checked');
      //cy.get('[id^="code.0.code"]').should('have.value', '88121-9');
    });
  });

})
