import {Injectable} from "@angular/core";
import {
  CodeSystemConcept,
  CodeSystemConceptProperty,
  UsageContext,
  ValueSet,
  ValueSetCompose,
  ValueSetComposeInclude,
  ValueSetComposeIncludeFilter
} from "fhir/r4";
import {Util} from "../lib/util";

@Injectable({
  providedIn: 'root'
})
export class TerminologyResourcesService {

  public createValueSets(concepts: CodeSystemConcept [], hierarchy: any [],
                         codeSystemUrl: string,
                         useContext: UsageContext[],
                         experimental: boolean,
                         date: string,
                         fhirIg: string,
                         status: any,
  ): ValueSet [] {
    const result: ValueSet [] = [];
    for (let codeSystemConcept of concepts) {
      const parenConceptCode = this.getParentConceptCode(codeSystemConcept?.code, hierarchy)
      if (!codeSystemConcept.code || !codeSystemConcept.display || parenConceptCode) {
        continue;
      }
      const valueSet: ValueSet = {
        resourceType: 'ValueSet',
        status,
        immutable: false,
        date: date,
        experimental,
        meta: {
          source: Util.FORMBUILDER_ENDPOINT,
          profile: ['https://aphp.fr/ig/fhir/eds/StructureDefinition/APHPEDSValueSet']
        }
      };

      valueSet.id = `${Util.sanitizeString(codeSystemConcept.code)}`;
      valueSet.name = valueSet.id;
      valueSet.title = codeSystemConcept.display;
      valueSet.description = 'ValueSet generated with AP-HP FormBuilder';
      valueSet.url = Util.buildUrl(fhirIg, 'ValueSet', valueSet.id);
      if (useContext) {
        valueSet.useContext = useContext;
      }
      const valueSetComposeInclude: ValueSetComposeInclude = {};
      valueSetComposeInclude.system = codeSystemUrl;
      const vsFilter: ValueSetComposeIncludeFilter = {
        op: 'descendent-of',
        property: "concept",
        value: codeSystemConcept.code
      };
      valueSetComposeInclude.filter = [vsFilter];

      const valueSetCompose: ValueSetCompose = {include: [valueSetComposeInclude]}
      valueSet.compose = valueSetCompose;
      result.push(valueSet);
    }
    return result;
  }

  public createCodeSystemConcepts(concepts: any [], hierarchy: any [], properties: any []): CodeSystemConcept [] {
    const codeSystemConcepts: CodeSystemConcept [] = [];
    for (let concept of concepts) {
      if (!concept.code || !concept.display) {
        continue;
      }
      const existingConcept = codeSystemConcepts.find(codeSystemConcept => codeSystemConcept.code === concept.code);
      if (!existingConcept) {
        const codeSystemConcept = {code: concept.code, display: concept.display};
        codeSystemConcepts.push(codeSystemConcept)
      }
    }
    const childCodeSystemConcepts = [];
    for (let codeSystemConcept of codeSystemConcepts) {

      this.addPropertyToConcept(codeSystemConcept, properties);
      const parentCode = this.getParentConceptCode(codeSystemConcept.code, hierarchy);
      const parentCodeSystemConcept = this.getParentCodeSystemConcept(codeSystemConcepts, parentCode);
      // if concept is child , attach it to his parent
      if (parentCodeSystemConcept) {
        this.addConceptChildToParent(codeSystemConcept, parentCodeSystemConcept);
        childCodeSystemConcepts.push(codeSystemConcept);
      }

    }
    return codeSystemConcepts.filter(csConcept => !childCodeSystemConcepts.some(childCodeSystemConcept => childCodeSystemConcept.code === csConcept.code));

  }

  public getParentConceptCode(conceptCode: string, hierarchy: any []): string {
    const result = hierarchy.find(element => element.child === conceptCode);
    return result?.parent;
  }

  private addConceptChildToParent(codeSystemConcept: CodeSystemConcept, parentCodeSystemConcept) {

    const childCodeSystemConcept = parentCodeSystemConcept?.concept?.find(value => value.code === codeSystemConcept.code);
    //if the concept child is not already related to his parent
    if (!childCodeSystemConcept) {
      // if the parent has others childs
      if (parentCodeSystemConcept.concept) {
        parentCodeSystemConcept.concept.push(codeSystemConcept);
      } else {
        parentCodeSystemConcept.concept = [codeSystemConcept];
      }
    }
  }

  private getParentCodeSystemConcept(codeSystemConcepts, parentCode): CodeSystemConcept {
    if (!parentCode || !codeSystemConcepts || codeSystemConcepts.length < 1) {
      return null;
    }
    for (const codeSystemConcept of codeSystemConcepts) {
      if (codeSystemConcept.code === parentCode) {
        return codeSystemConcept;
      }
    }
    for (const codeSystemConcept of codeSystemConcepts) {
      if (codeSystemConcept.concept) {
        return this.getParentCodeSystemConcept(codeSystemConcept.concept, parentCode);
      }
    }
    return null;
  }

  private addPropertyToConcept(concept: CodeSystemConcept, props: any[]) {
    const properties = props?.filter(value => value.code === concept.code);
    properties?.forEach(property => {
      if (property.code === concept.code) {
        let conceptPropertyToAdd = this.getConceptPropertyToAdd(property);
        if (concept.property && concept.property.length > 0) {
          const foundProperty = concept.property.find(p => p.code === property.key);
          if (!foundProperty) {
            concept.property.push(conceptPropertyToAdd);
          }
        } else {
          concept.property = [conceptPropertyToAdd];
        }
      }
    })
  }

  private getConceptPropertyToAdd(property) {
    let conceptpropertyToAdd: CodeSystemConceptProperty = {code: property.key}
    switch (property.type) {
      case 'string':
        conceptpropertyToAdd = {...conceptpropertyToAdd, valueString: property.value};
        break;
      case 'integer':
        conceptpropertyToAdd = {...conceptpropertyToAdd, valueInteger: Number(property.value)};
        break;
      case 'boolean':
        conceptpropertyToAdd = {...conceptpropertyToAdd, valueBoolean: this.stringToBoolean(property.value)};
        break;
      case 'code':
        conceptpropertyToAdd = {...conceptpropertyToAdd, valueCode: property.value};
        break;
      case 'dateTime':
        conceptpropertyToAdd = {...conceptpropertyToAdd, valueDateTime: property.value};
        break;
      case 'decimal':
        conceptpropertyToAdd = {...conceptpropertyToAdd, valueDecimal: Number(property.value)};
        break;
      case 'coding':
        conceptpropertyToAdd = {...conceptpropertyToAdd, valueCoding: property.value};
        break;
    }
    return conceptpropertyToAdd;
  }


  private stringToBoolean(str) {
    return str.toLowerCase() === "true";
  }
}
