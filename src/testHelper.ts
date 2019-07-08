// import { RequestConfig, WithAccessToken, ServerConnectionRequests } from "./api/serverConnection";
import { Token, IdentifiedModel } from "sellfazz-ts-daos";
import { ListDescription, Dict, NullableDict, FuncArgs,} from 'sellfazz-ts-generic'
import { CachedListState, SuccessfulPayload } from "./reducer";
import { Store } from "redux";
import { PayloadedAction } from './reducer/common'
// import { IOfflineStorageManager } from "./api/offlineStorage";

// export function generateIServerConnectionControlMock() {

//   return {
//     getToken: jest.fn(() => ({} as Token)),
//     setTokenAccessFunc: jest.fn((getTokenFunc: (() => Token)) => { }),
//     invalidateAccess: jest.fn((requestConfig: RequestConfig) => { }),
//     onAccessInvalidated: jest.fn((callback: (requestConfig: RequestConfig) => any) => { }),
//     getServerPath: jest.fn(() => ""),
//   }
// }
// export function generateServerConnectionRequestMocks() {
//   return {
//     get: jest.fn((path: string, config?: RequestConfig) => ({} as ListDescription<any>)),
//     post: jest.fn((path: string, body?: any, config?: RequestConfig) => { }),
//     patch: jest.fn((path: string, body?: any, config?: RequestConfig) => { }),
//     delete: jest.fn((path: string, body?: any, config?: RequestConfig) => { }),
//     put: jest.fn((path: string, body?: any, config?: RequestConfig) => { }),
//     withAccessToken: {
//       get: jest.fn((path: string, config?: RequestConfig) => ({} as ListDescription<any>)),
//       post: jest.fn((path: string, body?: any, config?: RequestConfig) => { }),
//       patch: jest.fn((path: string, body?: any, config?: RequestConfig) => { }),
//       delete: jest.fn((path: string, body?: any, config?: RequestConfig) => { }),
//       put: jest.fn((path: string, body?: any, config?: RequestConfig) => { }),
//     }
//   }
// }
// export function generateServerConnectionRequestGeneratorMocks(serverConnectionRequestMocks: ServerConnectionRequests & WithAccessToken) {
//   return {
//     generate: jest.fn(() => serverConnectionRequestMocks)
//   }
// }


export class SimpleStoreTestingManager<T>{
  store: Store<CachedListState<T>>
  constructor(store: Store<CachedListState<T>>){
    this.store = store
  }
  getSyncedList(): (T | null)[]{
    let dict = this.store.getState().syncedDict;
    return Object.keys(dict).map((key) => dict[key]);
  }
  getTempList(): (T | null)[]{
    let dict = this.store.getState().tempDict;
    return Object.keys(dict).map((key) => dict[key]);
  }

  getSyncedDict (): NullableDict<T>{
    return this.store.getState().syncedDict
  }
  getTempDict(): NullableDict<T> {
    return this.store.getState().tempDict; 
  }
}


export function getListWithoutId<T extends IdentifiedModel>(list: T[]): T[]{
  return list.map((item: T) => {
    let newItem = {...item as Object} as T
    delete newItem.id
    return newItem;
  })
}


export const loggerMiddleware = (store: Store) => (next: FuncArgs<[PayloadedAction]>) => (action: PayloadedAction) => {
  console.log('dispatching', action)
  let result = next(action)
  console.log('next state', store.getState())
  return result
}

export function compareTemporaryAddedItem<T>(payloadedAction: PayloadedAction<Dict<T>>, type: string, payload: T){

}

// export function generateDispatchMock(): jest.Mock<PayloadedAction>{
//   return jest.fn((x: PayloadedAction) => {})
// }

export function expectDispatch(dispatch: jest.Mock<PayloadedAction>){
  return {
    toHaveBeenAddingTemporaryItem<T>(type: string, payload: T){
      let callCount = dispatch.mock.calls.length 
      expect(callCount).toBeGreaterThan(0)
      let payloadedAction: PayloadedAction<Dict<T>> = dispatch.mock.calls[callCount-1][0]
      expect(payloadedAction.type).toBe(type)
      let keys = Object.keys(payloadedAction.payload)
      expect(keys).toHaveLength(1)
      expect(payloadedAction.payload[keys[0]]).toEqual(payload)
    },
    toHaveBeenSuccessfullyAddingItem<T>(type: string, payload: T){
      let callCount = dispatch.mock.calls.length 
      expect(callCount).toBeGreaterThan(0)
      let payloadedAction: PayloadedAction<SuccessfulPayload<T>> = dispatch.mock.calls[callCount-1][0]
      expect(payloadedAction.type).toBe(type)
      let revertedKeys = Object.keys(payloadedAction.payload.revertedTempDict)
      let committedSyncedKeys = Object.keys(payloadedAction.payload.committedSyncedDict)
      expect(revertedKeys).toHaveLength(1)
      expect(committedSyncedKeys).toHaveLength(1)
      expect(payloadedAction.payload.committedSyncedDict[committedSyncedKeys[0]]).toEqual(payload)

    },
    toHaveBeenFailedToAddingItem<T>(type: string, payload: T){
      let callCount = dispatch.mock.calls.length 
      expect(callCount).toBeGreaterThan(0)
      let payloadedAction: PayloadedAction<Dict<T>> = dispatch.mock.calls[callCount-1][0]
      expect(payloadedAction.type).toBe(type)
      let keys = Object.keys(payloadedAction.payload)
      expect(keys).toHaveLength(1)
      expect(payloadedAction.payload[keys[0]]).toEqual(payload)
    }
  }
}

export async function expectCatchPromise(promise: Promise<any>){
  let isThrown = false
  try {
    await promise
  }catch{
    isThrown = true
  }
  expect(isThrown).toBeTruthy()
}

// export function generateOfflineStorageManagerMocks<Item>(): IOfflineStorageManager<Item>{
//   return {
//     addUntaggedItem: jest.fn((item: Item) => {}),
//     removeUntaggedItem: jest.fn((temporaryId: string) => {}),
//     tagUntaggedItem: jest.fn((temporaryId: string) => {}),
//     saveTaggedItem: jest.fn((id: string, item: Item | null) => {}),
//     removeTaggedItem: jest.fn((id: string) => {}),
//     getAllUntaggedItems: jest.fn(() => {}),
//     getAllTaggedItems: jest.fn(() => {}),
//     getUntaggedItem: jest.fn((temporaryId: string) => {}),
//     getTaggedItem: jest.fn((id: string) => {}),
//     clearAllUntaggedItems: jest.fn(() => {}),
//     clearAllTaggedItems: jest.fn(() => {})
//   }
// }