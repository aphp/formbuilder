/**
 * Form related helper functions.
 */
import {inject, Injectable, SimpleChange} from '@angular/core';
import {IDType, ITreeNode} from '@bugsplat/angular-tree-component/lib/defs/api';
import {TreeModel} from '@bugsplat/angular-tree-component';
import fhir from 'fhir/r4';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {MessageDlgComponent, MessageType} from '../lib/widgets/message-dlg/message-dlg.component';
import {Observable, Subject} from 'rxjs';
import jsonTraverse from 'traverse';
import traverse from 'traverse';
import ngxItemSchema from '../../assets/ngx-item.schema.json';
import itemLayout from '../../assets/items-layout.json';
import ngxFlSchema from '../../assets/ngx-fl.schema.json';
import flLayout from '../../assets/fl-fields-layout.json';
import itemEditorSchema from '../../assets/item-editor.schema.json';
import {Util} from '../lib/util';
import {FetchService} from './fetch.service';
import fhirSchemaDefinitions from '../../assets/fhir-definitions.schema.json';

declare var LForms: any;

@Injectable({
  providedIn: 'root'
})
export class FormService {
  static _lformsLoaded$ = new Subject<string>();

  private _loading = false;
  _guidingStep$: Subject<string> = new Subject<string>();
  _formReset$: Subject<void> = new Subject<void>();
  _formChanged$: Subject<SimpleChange> = new Subject<SimpleChange>();
  _advPanelState = {
    formLevel: true,
    itemLevel: true
  }

  localStorageError: Error = null;
  treeModel: TreeModel;
  itemSchema: any = {properties: {}};
  flSchema: any = {properties: {}};
  private readonly _itemEditorSchema: any = {properties: {}};

  snomedUser = false;
  _lformsErrorMessage = null;
  _windowOpenerUrl: string = null;

  fetchService = inject(FetchService);

  constructor(private modalService: NgbModal) {
    [{schema: ngxItemSchema as any, layout: itemLayout}, {
      schema: ngxFlSchema as any,
      layout: flLayout
    }].forEach((obj) => {
      if (!obj.schema.definitions) {
        obj.schema.definitions = {};
      }
      obj.schema.definitions = fhirSchemaDefinitions.definitions as any;
      this._updateExtension(obj.schema);
      obj.schema.layout = obj.layout;
    });
    this.itemSchema = ngxItemSchema;
    this.flSchema = ngxFlSchema;
    this._itemEditorSchema = itemEditorSchema;

  }

  public get itemEditorSchema() {
    return this._itemEditorSchema;
  }

  /**
   * Get item level schema
   */
  getItemSchema() {
    return this.itemSchema;
  }

  /**
   * Get form level schema
   */
  getFormLevelSchema() {
    return this.flSchema;
  }

  /**
   * Update main schema with adjusted extension schema recursively
   *
   * @param rootSchema
   */
  _updateExtension(rootSchema: any) {
    const extension = rootSchema.definitions.Extension;
    traverse(rootSchema, {}, (
      schema,
      jsonPtr,
      rootSch,
      parentJsonPtr,
      parentKeyword,
      parentSchema,
      indexOrProp) => {
      if (parentKeyword === 'items' && (parentJsonPtr.endsWith('extension') || parentJsonPtr.endsWith('modifierExtension'))) {
        // Save title and description before over writing them.
        const commonFields = {title: schema.title, description: schema.description};
        Object.assign(schema, extension);
        // title and description are overwritten. Restore them.
        if (commonFields.title) {
          schema.title = commonFields.title;
        }
        if (commonFields.description) {
          schema.description = commonFields.description;
        }
      }
    });
  }

  get windowOpenerUrl(): string {
    return this._windowOpenerUrl;
  }

  set windowOpenerUrl(url: string) {
    this._windowOpenerUrl = url;
  }

  get lformsErrorMessage(): string | null {
    return this._lformsErrorMessage;
  }

  set loading(loading: boolean) {
    this._loading = loading;
  }

  get loading(): boolean {
    return this._loading;
  }

  /**
   * Access guiding step observable.
   */
  get guidingStep$(): Observable<string> {
    return this._guidingStep$.asObservable();
  }

  static get lformsLoaded$(): Observable<string> {
    return FormService._lformsLoaded$.asObservable();
  }


  /**
   * Getter for form reset Observable
   */
  get formReset$(): Observable<void> {
    return this._formReset$.asObservable();
  }

  /**
   * Form changed getter. Triggered when new form is loaded, such as clicking different node on the sidebar.
   * @return - Observable resolving to SimpleChange object.
   */
  get formChanged$(): Observable<SimpleChange> {
    return this._formChanged$.asObservable();
  }

  /**
   * Trigger formChanged$ observable with form changes.
   *
   * @param change - SimpleChange object representing changes to the form.
   */
  formChanged(change: SimpleChange): void {
    this._formChanged$.next(change);
  }

  /**
   * Notify form reset event.
   */
  resetForm(): void {
    this._formReset$.next(null);
  }

  /**
   * Inform the listeners of change in step.
   * @param step
   */
  setGuidingStep(step: string) {
    this._guidingStep$.next(step);
  }

  /**
   * Setter for form level advanced panel state
   */
  set formLevel(collapse: boolean) {
    this._advPanelState.formLevel = collapse;
  }

  /**
   * Getter for form level advanced panel state
   */
  get formLevel(): boolean {
    return this._advPanelState.formLevel;
  }

  /**
   * Setter for item level advanced panel state
   */
  set itemLevel(collapse: boolean) {
    this._advPanelState.itemLevel = collapse;
  }

  /**
   * Getter for item level advanced panel state
   */
  get itemLevel(): boolean {
    return this._advPanelState.itemLevel;
  }


  /**
   * Intended to collect source items for enable when logic
   * Get sources for focused item.
   */
  getSourcesExcludingFocusedTree(): ITreeNode [] {
    let ret = null;
    if (this.treeModel) {
      const fNode = this.treeModel.getFocusedNode();
      ret = this.getEnableWhenSources(fNode);
    }
    return ret;
  }


  /**
   * Get sources excluding the branch of a given node.
   * @param focusedNode
   * @param treeModel?: Optional tree model to search. Default is this.treeModel.
   */
  getEnableWhenSources(focusedNode: ITreeNode, treeModel?: TreeModel): ITreeNode [] {
    if (!treeModel) {
      treeModel = this.treeModel;
    }
    let ret = null;
    if (treeModel) {
      ret = this.getEnableWhenSources_(treeModel.roots, focusedNode);
    }
    return ret;
  }


  /**
   * Get sources from a given list of nodes excluding the branch of focused node.
   * @param nodes - List of nodes to search
   * @param focusedNode - Reference node to exclude the node and its descending branch
   * @private
   */
  private getEnableWhenSources_(nodes: ITreeNode [], focusedNode: ITreeNode): ITreeNode [] {
    const ret: ITreeNode [] = [];
    for (const node of nodes) {
      if (node !== focusedNode) {
        if (node.data.type !== 'group' && node.data.type !== 'display') {
          ret.push(node);
        }
        if (node.hasChildren) {
          ret.push.apply(ret, this.getEnableWhenSources_(node.children, focusedNode));
        }
      }
    }
    return ret;
  }


  /**
   * Setter
   * @param treeModel
   */
  setTreeModel(treeModel: TreeModel) {
    this.treeModel = treeModel;
  }


  /**
   * Get node by its id.
   * @param id
   */
  getTreeNodeById(id: IDType): ITreeNode {
    return this.treeModel.getNodeById(id);
  }


  /**
   * Get a node by linkId from entire tree.
   * @param linkId
   */
  getTreeNodeByLinkId(linkId: string): ITreeNode {
    if (!linkId || !this.treeModel?.roots) {
      return null
    }
    return this.findNodeByLinkId(this.treeModel.roots, linkId);
  }

  getNodesHavingEnableWhenDependency(linkId: string): string [] {
    if (!linkId || !this.treeModel?.roots) {
      return null
    }
    const result = this.findNodesHavingEnableWhenDependency(this.treeModel.roots, linkId);
    if (Util.isIterable(result)) {
      return [...new Set(result)]
    }
    return [];
  }

  /**
   * Get a node by linkId from a given set of tree nodes.
   * @param targetNodes - Array of tree nodes
   * @param linkId - linkId associated with item of the node.
   */
  findNodeByLinkId(targetNodes: ITreeNode [], linkId: string): ITreeNode {
    let ret: ITreeNode;
    if (!targetNodes || targetNodes.length === 0) {
      return null;
    }
    for (const node of targetNodes) {
      if (node.data.linkId === linkId) {
        ret = node;
      } else if (node.hasChildren) {
        ret = this.findNodeByLinkId(node.children, linkId);
      }
      if (ret) {
        break;
      }
    }
    return ret;
  }

  findNodesHavingEnableWhenDependency(targetNodes: ITreeNode [], linkId: string): string [] {
    let ret = [];
    if (!targetNodes || targetNodes.length === 0) {
      return [];
    }
    for (const node of targetNodes) {
      if (node.data.enableWhen && node.data.enableWhen.length > 0) {
        for (const enableWhen of node.data.enableWhen) {
          if (enableWhen && enableWhen.question === linkId) {
            ret.push(node.data.linkId);
          }
        }
      }
      if (node.hasChildren) {
        ret = ret.concat(this.findNodesHavingEnableWhenDependency(node.children, linkId));
      }
    }
    return ret;
  }

  /**
   * General purpose information dialog
   *
   * @param title - Title of dialog
   * @param message - Message to display
   * @param type - INFO | WARNING | DANGER
   */
  showMessage(title: string, message: string, type: MessageType = MessageType.INFO) {

    const modalRef = this.modalService.open(MessageDlgComponent, {scrollable: true});
    modalRef.componentInstance.title = title;
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.type = type;
  }


  /**
   * Parse input string to questionnaire.
   * @param text - Text content of input form, either FHIR questionnaire or LForms format.
   */
  parseQuestionnaire(text: string): fhir.Questionnaire {
    const invalidError = new Error('Not a valid JSON');
    if (!text) {
      throw invalidError;
    }

    let jsonObj = null;
    try {
      jsonObj = JSON.parse(text);
    } catch (e) {
      throw invalidError;
    }

    if (jsonObj.resourceType !== 'Questionnaire') {
      if (!!jsonObj.name) {
        jsonObj = LForms.Util._convertLFormsToFHIRData('Questionnaire', 'R4', jsonObj);
      } else {
        throw new Error('Not a valid questionnaire');
      }
    }

    return this.updateFhirQuestionnaire(jsonObj);
  }


  /**
   * Possible adjustments to questionnaire.
   *
   * @param questionnaire - Input questionnaire
   */
  updateFhirQuestionnaire(questionnaire: fhir.Questionnaire): fhir.Questionnaire {
    jsonTraverse(questionnaire).forEach(function(x) {
      if (x?.item) {
        // Convert any help text items to __$helpText.
        let htIndex = Util.findItemIndexWithHelpText(x.item);

        if(htIndex >= 0) {
          const helpText = x.item[htIndex];
          jsonTraverse(x).set(['__$helpText'], helpText);
          x.item.splice(htIndex, 1);
          if(x.item.length === 0) {
            delete x.item;
          }
        }
      }
    });

    return questionnaire;
  }


  /**
   * Remove questionnaire from local storage.
   */
  clearAutoSavedForm() {
    localStorage.removeItem('fhirQuestionnaire');
  }


  /**
   * Save questionnaire in local storage
   * @param fhirQ - Questionnaire
   */
  autoSaveForm(fhirQ: fhir.Questionnaire) {
    this.autoSave('fhirQuestionnaire', fhirQ);
    this.notifyWindowOpener({type: 'updateQuestionnaire', questionnaire: fhirQ});
  }

  /**
   * Send data to parent window (window that opened this page).
   *
   * @param data - Data to post.
   */
  notifyWindowOpener(data: any) {
    if (this._windowOpenerUrl) {
      window.opener.postMessage(data, this._windowOpenerUrl);
    }
  }


  /**
   * Retrieve questionnaire from the storage.
   */
  autoLoadForm(): fhir.Questionnaire {
    const saveQ = this.autoLoad('fhirQuestionnaire');
    return this.updateFhirQuestionnaire(saveQ) as fhir.Questionnaire;
  }


  /**
   * Store key, value to local storage. Checks the availability of storage before saving.
   * @param key - Key for storage.
   * @param value - Object or string to store.
   */
  autoSave(key: string, value: any) {
    if (this._storageAvailable('localStorage')) {
      if (value) {
        if (key !== 'state' && value) {
          // Non state are objects
          localStorage.setItem(key, JSON.stringify(value));
        } else {
          // State is string type.
          localStorage.setItem(key, value);
        }
      } else {
        localStorage.removeItem(key);
      }
    } else {
      console.error('Local storage not available!');
    }
  }


  /**
   * Retrieve an item from local storage
   * @param key - Key of the item to retrieve
   */
  autoLoad(key: string): any {
    let ret: any = null;
    if (this._storageAvailable('localStorage')) {
      const str = localStorage.getItem(key);
      if (str) {
        if (key !== 'state') {
          ret = JSON.parse(str);
        } else {
          ret = str;
        }
      }
    } else {
      console.error('Local storage not available!');
    }
    return ret;
  }


  /**
   * Test the storage for availability
   * @param type - localStorage | sessionStorage
   * @return boolean
   */
  _storageAvailable(type): boolean {
    let storage;
    try {
      storage = window[type];
      const x = '__storage_test__';
      storage.setItem(x, x);
      storage.removeItem(x);
      this.localStorageError = null;
      return true;
    } catch (e) {
      this.localStorageError = e;
      return e instanceof DOMException && (
          // everything except Firefox
          e.code === 22 ||
          // Firefox
          e.code === 1014 ||
          // test name field too, because code might not be present
          // everything except Firefox
          e.name === 'QuotaExceededError' ||
          // Firefox
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
        // acknowledge QuotaExceededError only if there's something already stored
        (storage && storage.length !== 0);
    }
  }


  /**
   * Check if a questionnaire is saved in local storage.
   */
  isAutoSaved(): boolean {
    return !!localStorage.getItem('fhirQuestionnaire');
  }

  /**
   * Get snomed user flag.
   */
  isSnomedUser(): boolean {
    return this.snomedUser;
  }

  /**
   * Set snomed user flag.
   * @param accepted -boolean
   */
  setSnomedUser(accepted: boolean) {
    this.snomedUser = accepted;
    if (this.snomedUser) {
      this.fetchService.fetchSnomedEditions();
    }
  }

}
