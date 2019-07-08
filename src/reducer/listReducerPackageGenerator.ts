import { IdentifiedModel, BaseEntityModel } from "sellfazz-ts-daos";
import { ReducerPackage } from "./reducerPackage";
import { PayloadedActionCreator, PromisedThunkActionCreator, PayloadedDispatch, makePayloadedAction, SimplePayloadedActionCreator, EpicMethod } from "./common";
import { Dict, Indexer, NullableDict, FuncArgs, AsyncFuncArgs, KeyValue,delay } from "sellfazz-ts-generic";
export interface CachedListState<T> {
  syncedDict: NullableDict<T>;
  tempDict: NullableDict<T>;
}

export function toCleanList<T>(dict: NullableDict<T>): T[] {
  return Object.keys(dict).filter(key => dict[key] != null).map(key => dict[key] as T);
}

export function toSelectedDictionary<T>(keys: string[], dict: NullableDict<T>): NullableDict<T> {
  const newDict: NullableDict<T> = {};
  keys.forEach(key => {
    if (!dict[key]) {
      return;
    }
    newDict[key] = dict[key];
  });
  return newDict;
}


export function getSyncedCachedList<T>(cachedListState: CachedListState<T>): T[] {
  return toCleanList(cachedListState.syncedDict);
}
export function getTempCachedList<T>(cachedListState: CachedListState<T>): T[] {
  return toCleanList(cachedListState.tempDict);
}
export function getModifiedCachedList<T>(cachedListState: CachedListState<T>): T[] {
  return toCleanList(getModifiedCachedDict(cachedListState));
}
export function getModifiedCachedDict<T>(cachedListState: CachedListState<T>): NullableDict<T> {
  return {
    ...cachedListState.syncedDict,
    ...cachedListState.tempDict
  }
}


export function getModifiedCachedListWithValidIdDesc<T extends (IdentifiedModel & BaseEntityModel)>(cachedListState: CachedListState<T>): T[] {
  return getModifiedCachedListWithValidId(cachedListState).sort((a,b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime())
}
export function getModifiedCachedListWithValidId<T extends (IdentifiedModel)>(cachedListState: CachedListState<T>): T[] {
  return toCleanList(getModifiedCachedDict(cachedListState)).filter(t => t.id)
}


export function hasUnsavedItems<T>(cachedListState: CachedListState<T>): boolean {
  return Object.keys(cachedListState.tempDict).length > 0;
}

export type CachedListReducerPackage<Order> = ReducerPackage<CachedListState<Order>>;

export const SET_TEMP_DICT = "SET_TEMP_DICT";
export const SET_SYNCED_DICT = "SET_SYNCED_DICT";
export const SET_SYNCED_DICT_WITH_CLEAR_TEMP = "SET_SYNCED_DICT_WITH_CLEAR_TEMP";
export const APPEND_TEMP_DICT = "APPEND_TEMP_DICT";
export const APPEND_TEMP_ITEM = "APPEND_TEMP_ITEM";
export const FINALIZE_TEMP_DICT = "FINALIZE_TEMP_DICT";

const LIST = "LIST";
const ITEM = "ITEM";

const ADD = "ADD";
const DELETE = "DELETE";
const UPDATE = "UPDATE";

export const ADD_LIST = ADD + "_" + LIST;
export const UPDATE_LIST = UPDATE + "_" + LIST;
export const DELETE_LIST = DELETE + "_" + LIST;
export const ADD_ITEM = ADD + "_" + ITEM;
export const UPDATE_ITEM = UPDATE + "_" + ITEM;
export const DELETE_ITEM = DELETE + "_" + ITEM;

export const GET_LIST = "GET_LIST";
export const GET_ITEM = "GET_ITEM";

export const RESET_TEMP_DICT = "RESET_TEMP_DICT";
export const RESET_SYNCED_DICT = "RESET_SYNCED_DICT";

export const CLEAR_TEMP_DICT = "CLEAR_TEMP_DICT";
export const CLEAR_SYNCED_DICT = "CLEAR_SYNCED_DICT";
export const CLEAR_BOTH_DICT = "CLEAR_BOTH_DICT";

const SUCCESS = 'SUCCESS';
const STARTED = 'STARTED';
const FAILED = 'FAILED';

export function generateId(prefix?: string): string {
  let randomNumber1 = Math.random() * 10e16
  let randomNumber2 = Math.random() * 10e16
  prefix = prefix || "";
  return prefix + numberToAlphaNumeric(new Date().getTime()) + numberToAlphaNumeric(randomNumber1) + numberToAlphaNumeric(randomNumber2);
}

function numberToAlphaNumeric(n: number): string {
  let arr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let count = arr.length;
  let newString = ""
  do {
    let remainder = n % count;
    newString += arr.charAt(remainder);
    n = n / count;
  } while (n > count);
  return newString;
}

export function getDefaultCachedListState() {
  return {
    tempDict: {},
    syncedDict: {}
  }
}

export interface SuccessfulPayload<T> {
  revertedTempDict: Dict<T>;
  committedSyncedDict: Dict<T>
}

export function composeActionName(prefix: string, name: string, suffix?: string): string {
  return prefix + "." + name + (suffix ? '_' + suffix : '');
}


export class ListReducerPackageGenerator<T> {
  private identifier: Indexer<T>;
  private reducerPackage: ReducerPackage<CachedListState<T>>;
  private prefix: string;
  public appendingTempDictActionCreator: SimplePayloadedActionCreator<NullableDict<T>>
  public appendingTempItemActionCreator: PayloadedActionCreator<[string, T | null], KeyValue<T | null>>
  public resettingTempDictActionCreator: PayloadedActionCreator<[NullableDict<T>?], NullableDict<T>>
  public resettingSyncedDictActionCreator: PayloadedActionCreator<[NullableDict<T>?], NullableDict<T>>
  public settingTempDictActionCreator: SimplePayloadedActionCreator<NullableDict<T>>
  public settingSyncedDictActionCreator: SimplePayloadedActionCreator<NullableDict<T>>
  public clearingTempDictActionCreator: PayloadedActionCreator<[string[]?], string[] | undefined>
  public clearingSyncedDictActionCreator: PayloadedActionCreator<[string[]?], string[] | undefined>
  public clearingBothDictActionCreator: PayloadedActionCreator<[string[]?], string[] | undefined>
  public finalizingTempDictActionCreator: PromisedThunkActionCreator<[CachedListState<T>]>

  constructor(prefix: string, identifier: Indexer<T>, reducerPackage?: ReducerPackage<CachedListState<T>>) {
    this.identifier = identifier;
    this.prefix = prefix;
    this.reducerPackage = reducerPackage ? reducerPackage : new ReducerPackage<CachedListState<T>>();
    this.reducerPackage.addHandler(this.withPrefix(SET_TEMP_DICT), (state, payload: NullableDict<T>) => {
      const tempDict = {
        ...state.tempDict,
        ...payload
      }
      // null means to be deleted
      return {
        ...state,
        tempDict
      }
    })
    this.reducerPackage.addHandler(this.withPrefix(SET_SYNCED_DICT), (state: CachedListState<T>, payload: NullableDict<T>) => {
      const syncedDict = {
        ...state.syncedDict,
        ...payload
      }
      // null means deleted, might as well remove the list
      Object.keys(syncedDict).forEach(key => {
        if (syncedDict[key] == null) {
          delete syncedDict[key];
        }
      })
      return {
        ...state,
        syncedDict
      }
    })

    this.reducerPackage.addHandler(this.withPrefix(SET_SYNCED_DICT_WITH_CLEAR_TEMP), (state: CachedListState<T>, payload: SuccessfulPayload<T>) => {
      let clearedIds = Object.keys({
        ...payload.revertedTempDict,
        ...payload.committedSyncedDict,
      })
      const syncedDict = {
        ...state.syncedDict,
        ...payload.committedSyncedDict
      }

      const tempDict = { ...state.tempDict };

      // null means deleted, might as well remove the list
      clearedIds.forEach(key => {
        delete tempDict[key];
      })

      // null means deleted, might as well remove the list
      Object.keys(syncedDict).forEach(key => {
        if (syncedDict[key] == null) {
          delete syncedDict[key];
        }
      })
      return {
        ...state,
        tempDict,
        syncedDict
      }
    })





    this.reducerPackage.addHandler<KeyValue<T | null>>(this.withPrefix(APPEND_TEMP_ITEM), (state: CachedListState<T>, payload: KeyValue<T | null>) => {
      return {
        ...state,
        tempDict: {
          ...state.tempDict,
          [payload.key]: payload.value
        }
      }
    })

    this.reducerPackage.addHandler<NullableDict<T>>(this.withPrefix(RESET_TEMP_DICT), (state: CachedListState<T>, payload: NullableDict<T>) => {
      return {
        ...state,
        tempDict: payload
      }
    })
    this.reducerPackage.addHandler<NullableDict<T>>(this.withPrefix(RESET_SYNCED_DICT), (state: CachedListState<T>, payload: NullableDict<T>) => {
      return {
        ...state,
        syncedDict: payload || {}
      }
    })

    this.reducerPackage.addHandler<string[]>(this.withPrefix(CLEAR_TEMP_DICT), (state: CachedListState<T>, payload: string[] | undefined) => {
      let tempDict = { ...state.tempDict };
      if (payload) {
        payload.forEach((id: string) => {
          delete tempDict[id];
        })
      } else {
        tempDict = {}
      }
      return {
        ...state,
        tempDict
      }
    })
    this.reducerPackage.addHandler<string[]>(this.withPrefix(CLEAR_SYNCED_DICT), (state: CachedListState<T>, payload: string[] | undefined) => {
      let syncedDict = { ...state.syncedDict };
      if (payload) {
        payload.forEach((id: string) => {
          delete syncedDict[id];
        })
      } else {
        syncedDict = {}
      }
      return {
        ...state,
        syncedDict
      }
    })
    this.reducerPackage.addEpic(this.withPrefix(CLEAR_BOTH_DICT), async (payload: string[] | undefined) => [
      makePayloadedAction(this.withPrefix(CLEAR_TEMP_DICT), payload),
      makePayloadedAction(this.withPrefix(CLEAR_SYNCED_DICT), payload)
    ])
    this.appendingTempDictActionCreator = (payload: NullableDict<T>) => makePayloadedAction(this.withPrefix(APPEND_TEMP_DICT), payload);
    this.appendingTempItemActionCreator = (id: string, item: T | null) => makePayloadedAction(this.withPrefix(APPEND_TEMP_ITEM), {
      key: id,
      value: item
    })
    this.resettingTempDictActionCreator = (payload?: NullableDict<T>) => makePayloadedAction(this.withPrefix(RESET_TEMP_DICT), payload ? payload : {});
    this.resettingSyncedDictActionCreator = (payload?: NullableDict<T>) => makePayloadedAction(this.withPrefix(RESET_SYNCED_DICT), payload ? payload : {});
    this.settingTempDictActionCreator = (payload: NullableDict<T>) => makePayloadedAction(this.withPrefix(SET_TEMP_DICT), payload);
    this.settingSyncedDictActionCreator = (payload: NullableDict<T>) => makePayloadedAction(this.withPrefix(SET_SYNCED_DICT), payload);
    this.clearingTempDictActionCreator = (payload?: string[]) => makePayloadedAction(this.withPrefix(CLEAR_TEMP_DICT), payload);
    this.clearingSyncedDictActionCreator = (payload?: string[]) => makePayloadedAction(this.withPrefix(CLEAR_SYNCED_DICT), payload);
    this.clearingBothDictActionCreator = (payload?: string[]) => makePayloadedAction(this.withPrefix(CLEAR_BOTH_DICT), payload);
    this.finalizingTempDictActionCreator = this.registerAddAllThunk();
  }

  private registerAddAllThunk(): PromisedThunkActionCreator<[CachedListState<T>]> {
    return this.reducerPackage.registerThunk(this.withPrefix(FINALIZE_TEMP_DICT), (cachedList: CachedListState<T>) => {
      return async (dispatch: PayloadedDispatch) => {
        const tempDict = cachedList.tempDict;
        const syncedDict = cachedList.syncedDict;
        const toAddKey: string[] = Object.keys(tempDict)
          .filter(key => syncedDict[key] === undefined && tempDict[key] != null)
        const toAddList = toAddKey.map(key => tempDict[key] as T);
        const toAddDict = toSelectedDictionary(toAddKey, tempDict) as Dict<T>;


        const toUpdateKey: string[] = Object.keys(tempDict)
          .filter(key => syncedDict[key] !== undefined && tempDict[key] != null)
        const toUpdateList = toUpdateKey.map(key => tempDict[key] as T);
        const toUpdateDict = toSelectedDictionary(toUpdateKey, tempDict) as Dict<T>;


        const toDeleteKey: string[] = Object.keys(tempDict)
          .filter(key => syncedDict[key] !== undefined && syncedDict[key] !== null && tempDict[key] == null)
        const toDeleteList = toDeleteKey.map(key => syncedDict[key] as T);
        const toDeleteDict = toSelectedDictionary(toDeleteKey, syncedDict) as Dict<T>;

        const promises: Promise<any>[] = []

        if (this.addListFunc) {
          promises.push(this.startExecutingAddingList(dispatch, toAddList, toAddDict))
        }
        else if (this.addItemFunc) {
          Object.keys(toAddDict).forEach(key => {
            promises.push(this.startExecutingAddingItem(dispatch, toAddDict[key], {
              [key]: toAddDict[key]
            }))
          })
        }

        if (this.updateListFunc) {
          promises.push(this.startExecutingUpdatingList(dispatch, toUpdateList, toUpdateDict))
        }
        else if (this.updateItemFunc) {
          Object.keys(toUpdateDict).forEach(key => {
            promises.push(this.startExecutingUpdatingItem(dispatch, toUpdateDict[key], {
              [key]: toUpdateDict[key]
            }))
          })
        }

        if (this.deleteListFunc) {
          promises.push(this.startExecutingDeletingList(dispatch, toDeleteList, toDeleteDict))
        }
        else if (this.deleteItemFunc) {          
          Object.keys(toDeleteDict).forEach(key => {
            promises.push(this.startExecutingDeletingItem(dispatch, toDeleteDict[key], {
              [key]: toDeleteDict[key]
            }));
          });
        }
        await Promise.all(promises);
      };
    });
  }

  getReducerPackage(): ReducerPackage<CachedListState<T>> {
    return this.reducerPackage;
  }

  private withPrefix(name: string, suffix?: string): string {
    return composeActionName(this.prefix, name, suffix)
  }

  onAddingItem(func: AsyncFuncArgs<[T], T>): this {
    this.setOnAddingItem(func);
    return this;
  }

  getNullDict(dict: Dict<T>): Dict<null> {
    const nullDict: Dict<null> = {};
    Object.keys(dict).forEach((key) => {
      nullDict[key] = null;
    })
    return nullDict;
  }

  convertItemToDict(item: T, idGenerator: Indexer<T>): Dict<T> {
    const id: string = idGenerator(item);
    const dict: Dict<T> = {
      [id]: item
    }
    return dict;
  }
  convertListToDict(list: T[], idGenerator: Indexer<T>): Dict<T> {
    const dict: Dict<T> = {}
    list.forEach((item) => {
      const id: string = idGenerator(item);
      dict[id] = item;
    })
    return dict;
  }

  private addItemFunc: AsyncFuncArgs<[T], T> | undefined;

  private async startExecutingAddingItem(dispatch: PayloadedDispatch, item: T, tempDict: NullableDict<T>): Promise<T> {
    if (!this.addItemFunc) {
      throw new Error("method is not found");
    }
    try {
      const promise = this.addItemFunc(item);
      const newItem = await promise;
      const syncedDict = this.convertItemToDict(newItem, this.identifier);
      dispatch(makePayloadedAction(
        this.withPrefix(ADD_ITEM, SUCCESS),
        {
          revertedTempDict: tempDict,
          committedSyncedDict: syncedDict
        }
      ))
      return promise;
    } catch (e) {
      dispatch(makePayloadedAction(this.withPrefix(ADD_ITEM, FAILED), tempDict));
      throw e;
    }
  }

  setOnAddingItem(func: AsyncFuncArgs<[T], T>): PromisedThunkActionCreator<[T], T> {
    this.createStartedEpic(this.withPrefix(ADD_ITEM, STARTED))
    this.createSuccessfulEpic(this.withPrefix(ADD_ITEM, SUCCESS))
    this.createFailedEpic(this.withPrefix(ADD_ITEM, FAILED))
    this.addItemFunc = func
    const thunkFunc = (item: T) => {
      return async (dispatch: PayloadedDispatch) => {
        const tempDict = this.convertItemToDict(item, () => generateId());
        dispatch(makePayloadedAction(this.withPrefix(ADD_ITEM, STARTED), tempDict));
        return await this.startExecutingAddingItem(dispatch, item, tempDict)
      }
    }
    return this.reducerPackage.registerThunk(this.withPrefix(ADD_ITEM), thunkFunc);
  }

  onAddingList(func: AsyncFuncArgs<[T[]], T[]>): this {
    this.setOnAddingList(func);
    return this;
  }
  private addListFunc: AsyncFuncArgs<[T[]], T[]> | undefined;

  private async startExecutingAddingList(dispatch: PayloadedDispatch, list: T[], tempDict: NullableDict<T>): Promise<T[]> {
    if (!this.addListFunc) {
      throw new Error("method is not found");
    }
    try {
      const promise = this.addListFunc(list);
      const newList = await promise;
      const syncedDict = this.convertListToDict(newList, this.identifier);
      dispatch(makePayloadedAction(
        this.withPrefix(ADD_LIST, SUCCESS),
        {
          revertedTempDict: tempDict,
          committedSyncedDict: syncedDict
        }
      ))
      return promise;
    } catch (e) {
      dispatch(makePayloadedAction(this.withPrefix(ADD_LIST, FAILED), tempDict))
      throw e;
    }
  }
  setOnAddingList(func: AsyncFuncArgs<[T[]], T[]>): PromisedThunkActionCreator<[T[]], T[]> {
    this.createStartedEpic(this.withPrefix(ADD_LIST, STARTED))
    this.createSuccessfulEpic(this.withPrefix(ADD_LIST, SUCCESS))
    this.createFailedEpic(this.withPrefix(ADD_LIST, FAILED))
    this.addListFunc = func;
    const thunkFunc = (list: T[]) => {
      return async (dispatch: PayloadedDispatch) => {
        const tempDict = this.convertListToDict(list, () => generateId());
        dispatch(makePayloadedAction(this.withPrefix(ADD_LIST, STARTED), tempDict));
        return await this.startExecutingAddingList(dispatch, list, tempDict)
      }
    }
    return this.reducerPackage.registerThunk(this.withPrefix(ADD_LIST), thunkFunc);
  }

  onUpdatingItem(func: AsyncFuncArgs<[T], T>): this {
    this.setOnUpdatingItem(func);
    return this;
  }
  private updateItemFunc: AsyncFuncArgs<[T], T> | undefined;

  private async startExecutingUpdatingItem(dispatch: PayloadedDispatch, item: T, tempDict: NullableDict<T>): Promise<T> {
    if (!this.updateItemFunc) {
      throw new Error("method is not found");
    }
    try {
      const promise = this.updateItemFunc(item);
      const newItem = await promise;
      const syncedDict = this.convertItemToDict(newItem, this.identifier);
      dispatch(makePayloadedAction(
        this.withPrefix(UPDATE_ITEM, SUCCESS),
        {
          revertedTempDict: tempDict,
          committedSyncedDict: syncedDict
        }
      ))
      return promise;
    } catch (e) {
      dispatch(makePayloadedAction(this.withPrefix(UPDATE_ITEM, FAILED), tempDict))
      throw e;
    }

  }
  setOnUpdatingItem(func: AsyncFuncArgs<[T], T>): PromisedThunkActionCreator<[T], T> {
    this.createStartedEpic(this.withPrefix(UPDATE_ITEM, STARTED))
    this.createSuccessfulEpic(this.withPrefix(UPDATE_ITEM, SUCCESS))
    this.createFailedEpic(this.withPrefix(UPDATE_ITEM, FAILED))
    this.updateItemFunc = func;
    const thunkFunc = (item: T) => {
      return async (dispatch: PayloadedDispatch) => {
        const tempDict = this.convertItemToDict(item, this.identifier);
        dispatch(makePayloadedAction(this.withPrefix(UPDATE_ITEM, STARTED), tempDict));
        return await this.startExecutingUpdatingItem(dispatch, item, tempDict);
      }
    };
    return this.reducerPackage.registerThunk(this.withPrefix(UPDATE_ITEM), thunkFunc);
  }

  onUpdatingList(func: AsyncFuncArgs<[T[]], T[]>): this {
    this.setOnUpdatingList(func);
    return this;
  }

  private updateListFunc: AsyncFuncArgs<[T[]], T[]> | undefined;

  private async startExecutingUpdatingList(dispatch: PayloadedDispatch, list: T[], tempDict: NullableDict<T>): Promise<T[]> {
    if (!this.updateListFunc) {
      throw new Error("method is not found");
    }
    try {
      const promise = this.updateListFunc(list);
      const newList = await promise;
      const syncedDict = this.convertListToDict(newList, this.identifier);
      dispatch(makePayloadedAction(
        this.withPrefix(UPDATE_LIST, SUCCESS),
        {
          revertedTempDict: tempDict,
          committedSyncedDict: syncedDict
        }
      ))
      return promise;
    } catch (e) {
      dispatch(makePayloadedAction(this.withPrefix(UPDATE_LIST, FAILED), tempDict))
      throw e;
    }
  }
  setOnUpdatingList(func: AsyncFuncArgs<[T[]], T[]>): PromisedThunkActionCreator<[T[]], T[]> {
    this.createStartedEpic(this.withPrefix(UPDATE_LIST, STARTED))
    this.createSuccessfulEpic(this.withPrefix(UPDATE_LIST, SUCCESS))
    this.createFailedEpic(this.withPrefix(UPDATE_LIST, FAILED))
    this.updateListFunc = func;
    const thunkFunc = (list: T[]) => {
      return async (dispatch: PayloadedDispatch) => {
        const tempDict = this.convertListToDict(list, this.identifier);
        dispatch(makePayloadedAction(this.withPrefix(UPDATE_LIST, STARTED), tempDict));
        return await this.startExecutingUpdatingList(dispatch, list, tempDict);
      }
    }
    return this.reducerPackage.registerThunk(this.withPrefix(UPDATE_LIST), thunkFunc);
  }

  onDeletingItem(func: AsyncFuncArgs<[T], T>): this {
    this.setOnDeletingItem(func);
    return this;
  }

  private deleteItemFunc: AsyncFuncArgs<[T], T> | undefined;
  private async startExecutingDeletingItem(dispatch: PayloadedDispatch, item: T, tempDict: NullableDict<T>): Promise<T> {
    if (!this.deleteItemFunc) {
      throw new Error("method is not found");
    }
    try {
      const promise = this.deleteItemFunc(item);
      const newItem = await promise;
      const syncedDict = this.getNullDict(this.convertItemToDict(newItem, this.identifier));
      dispatch(makePayloadedAction(
        this.withPrefix(DELETE_ITEM, SUCCESS),
        {
          revertedTempDict: tempDict,
          committedSyncedDict: syncedDict
        }
      ))
      return promise;
    } catch (e) {
      dispatch(makePayloadedAction(this.withPrefix(DELETE_ITEM, FAILED), tempDict))
      throw e;
    }

  }

  setOnDeletingItem(func: AsyncFuncArgs<[T], T>): PromisedThunkActionCreator<[T], T> {
    this.createStartedEpic(this.withPrefix(DELETE_ITEM, STARTED))
    this.createSuccessfulEpic(this.withPrefix(DELETE_ITEM, SUCCESS))
    this.createFailedEpic(this.withPrefix(DELETE_ITEM, FAILED))
    this.deleteItemFunc = func;
    const thunkFunc = (item: T) => {
      return async (dispatch: PayloadedDispatch) => {
        const tempDict = this.getNullDict(this.convertItemToDict(item, this.identifier));
        dispatch(makePayloadedAction(this.withPrefix(DELETE_ITEM, STARTED), tempDict));
        return await this.startExecutingDeletingItem(dispatch, item, tempDict);
      }
    }
    return this.reducerPackage.registerThunk(this.withPrefix(DELETE_ITEM), thunkFunc);

  }

  onDeletingList(func: AsyncFuncArgs<[T[]], T[]>): this {
    this.setOnDeletingList(func);
    return this;
  }

  private deleteListFunc: AsyncFuncArgs<[T[]], T[]> | undefined;
  private async startExecutingDeletingList(dispatch: PayloadedDispatch, list: T[], tempDict: NullableDict<T>): Promise<T[]> {
    if (!this.deleteListFunc) {
      throw new Error("method is not found");
    }
    try {
      const promise = this.deleteListFunc(list);
      const newList = await promise;
      const syncedDict = this.getNullDict(this.convertListToDict(newList, this.identifier));
      dispatch(makePayloadedAction(
        this.withPrefix(DELETE_LIST, SUCCESS),
        {
          revertedTempDict: tempDict,
          committedSyncedDict: syncedDict
        }
      ))
      return promise;
    } catch (e) {
      dispatch(makePayloadedAction(this.withPrefix(DELETE_LIST, FAILED), tempDict))
      throw e;
    }

  }
  setOnDeletingList(func: AsyncFuncArgs<[T[]], T[]>): PromisedThunkActionCreator<[T[]], T[]> {
    this.createStartedEpic(this.withPrefix(DELETE_LIST, STARTED))
    this.createSuccessfulEpic(this.withPrefix(DELETE_LIST, SUCCESS))
    this.createFailedEpic(this.withPrefix(DELETE_LIST, FAILED))
    this.deleteListFunc = func;
    const thunkFunc = (list: T[]) => {
      return async (dispatch: PayloadedDispatch) => {
        const tempDict = this.getNullDict(this.convertListToDict(list, this.identifier));
        dispatch(makePayloadedAction(this.withPrefix(DELETE_LIST, STARTED), tempDict));
        return await this.startExecutingDeletingList(dispatch, list, tempDict);
      }
    }
    return this.reducerPackage.registerThunk(this.withPrefix(DELETE_LIST), thunkFunc);
  }

  createStartedEpic(name: string) {
    this.reducerPackage.addEpic(name, async (tempDict: Dict<T>) => {
      return [makePayloadedAction(this.withPrefix(SET_TEMP_DICT), tempDict)]
    });
  }

  addEpicOnAddingItemStarted(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(ADD_ITEM, STARTED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnAddingItemFailed(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(ADD_ITEM, FAILED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnAddingItemSuccessful(epicMethod: EpicMethod<SuccessfulPayload<T>>){
    let name = this.withPrefix(ADD_ITEM, SUCCESS)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnAddingListStarted(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(ADD_LIST, STARTED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnAddingListFailed(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(ADD_LIST, FAILED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnAddingListSuccessful(epicMethod: EpicMethod<SuccessfulPayload<T>>){
    let name = this.withPrefix(ADD_LIST, SUCCESS)
    this.reducerPackage.addEpic(name, epicMethod)    
  }


  addEpicOnDeletingItemStarted(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(DELETE_ITEM, STARTED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnDeletingItemFailed(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(DELETE_ITEM, FAILED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnDeletingItemSuccessful(epicMethod: EpicMethod<SuccessfulPayload<T>>){
    let name = this.withPrefix(DELETE_ITEM, SUCCESS)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnDeletingListStarted(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(DELETE_LIST, STARTED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnDeletingListFailed(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(DELETE_LIST, FAILED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnDeletingListSuccessful(epicMethod: EpicMethod<SuccessfulPayload<T>>){
    let name = this.withPrefix(DELETE_LIST, SUCCESS)
    this.reducerPackage.addEpic(name, epicMethod)    
  }



  addEpicOnUpdatingItemStarted(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(UPDATE_ITEM, STARTED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnUpdatingItemFailed(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(UPDATE_ITEM, FAILED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnUpdatingItemSuccessful(epicMethod: EpicMethod<SuccessfulPayload<T>>){
    let name = this.withPrefix(UPDATE_ITEM, SUCCESS)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnUpdatingListStarted(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(UPDATE_LIST, STARTED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnUpdatingListFailed(epicMethod: EpicMethod<Dict<T>>){
    let name = this.withPrefix(UPDATE_LIST, FAILED)
    this.reducerPackage.addEpic(name, epicMethod)    
  }

  addEpicOnUpdatingListSuccessful(epicMethod: EpicMethod<SuccessfulPayload<T>>){
    let name = this.withPrefix(UPDATE_LIST, SUCCESS)
    this.reducerPackage.addEpic(name, epicMethod)    
  }




  createFailedEpic(name: string) {
    this.reducerPackage.addEpic(name, async (cancelledTempDict: Dict<T>) => {
      return [makePayloadedAction(this.withPrefix(CLEAR_TEMP_DICT), Object.keys(cancelledTempDict))]
    });
  }

  createSuccessfulEpic(name: string) {
    this.reducerPackage.addEpic(name, async (payload: SuccessfulPayload<T>) => {
      return [
        makePayloadedAction(this.withPrefix(SET_SYNCED_DICT_WITH_CLEAR_TEMP), payload)
      ]
    });
  }

  onGettingCustomList<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T[]>): this {
    this.setOnGettingCustomList(name, func);
    return this;
  }

  setOnGettingCustomList<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T[]>): PromisedThunkActionCreator<Ts, T[]> {
    return this.setOnDoingCustomList(name, func);
  }

  onGettingList<Ts extends any[]>(func: AsyncFuncArgs<Ts, T[]>): this {
    this.setOnGettingList(func);
    return this;
  }

  setOnGettingList<Ts extends any[]>(func: AsyncFuncArgs<Ts, T[]>): PromisedThunkActionCreator<Ts, T[]> {
    return this.setOnDoingCustomList(GET_LIST, func);
  }

  onDoingCustomList<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T[]>): this {
    this.setOnDoingCustomList(name, func);
    return this;
  }

  setOnDoingCustomList<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T[]>): PromisedThunkActionCreator<Ts, T[]> {
    return this.setOnDoingCustomDictCore(name, func, (list: T[]) => {
      return this.convertListToDict(list, this.identifier);
    })
  }

  setOnDeletingCustomList<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T[]>): PromisedThunkActionCreator<Ts, T[]> {
    return this.setOnDoingCustomDictCore(name, func, (list: T[]) => {
      return this.getNullDict(this.convertListToDict(list, this.identifier));
    })
  }

  onGettingItem<Ts extends any[]>(func: AsyncFuncArgs<Ts, T>): this {
    this.setOnGettingItem(func);
    return this;
  }

  setOnGettingItem<Ts extends any[]>(func: AsyncFuncArgs<Ts, T>): PromisedThunkActionCreator<Ts, T> {
    return this.setOnDoingCustomItem(GET_ITEM, func);
  }

  onGettingCustomItem<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T>) {
    this.setOnDoingCustomItem(name, func);
    return this;
  }

  setOnGettingCustomItem<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T>): PromisedThunkActionCreator<Ts, T> {
    return this.setOnDoingCustomItem(name, func);
  }

  onDoingCustomItem<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T>): this {
    this.setOnDoingCustomItem(name, func);
    return this;
  }

  setOnDoingCustomItem<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T>): PromisedThunkActionCreator<Ts, T> {
    return this.setOnDoingCustomDictCore(name, func, (item: T) => {
      const id = this.identifier(item);
      return {
        [id]: item
      }
    })
  }

  onDeletingCustomItem<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T>): this {
    this.setOnDeletingCustomItem(name, func);
    return this;
  }

  setOnDeletingCustomItem<Ts extends any[]>(name: string, func: AsyncFuncArgs<Ts, T>): PromisedThunkActionCreator<Ts, T> {
    return this.setOnDoingCustomDictCore(name, func, (item: T) => {
      const id = this.identifier(item);
      return {
        [id]: null
      }
    })
  }


  private setOnDoingCustomDictCore<Ts extends any[], TOut>(name: string, prefunc: AsyncFuncArgs<Ts, TOut>, toDictFunc: FuncArgs<[TOut], NullableDict<T>>): PromisedThunkActionCreator<Ts, TOut> {
    this.createSuccessfulEpic(this.withPrefix(name, SUCCESS))
    return this.reducerPackage.registerThunk(this.withPrefix(name), (...args: Ts) => {
      return async (dispatch) => {
        try {
          dispatch(makePayloadedAction(this.withPrefix(name, STARTED), args));
          const returnedValue = await prefunc(...args);
          const newDict = toDictFunc(returnedValue);
          dispatch(makePayloadedAction(
            this.withPrefix(name, SUCCESS),
            {
              committedSyncedDict: newDict,
              revertedTempDict: {}
            }
          ));
          return returnedValue;
        } catch (e) {
          dispatch(makePayloadedAction(this.withPrefix(name, FAILED), args));
          throw e;
        }
      }
    });
  }

}
