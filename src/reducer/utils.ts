import { ReduxActionCreators, ReducerGeneratorBase } from "./reducerGeneratorBase";
import { Dict } from "sellfazz-ts-generic";
import { ReducerPackage, SfEpic, PayloadedAction } from "../reducer";
import { ReducersMapObject, Reducer, combineReducers, applyMiddleware, createStore, Store, Middleware, StoreEnhancer, StoreCreator } from "redux";
import { combineEpics, createEpicMiddleware, EpicMiddleware } from "redux-observable";
import thunk from "redux-thunk";

export type ReduxActionCreatorsDict = Dict<ReduxActionCreators>;
export type ReducerGeneratorsForState<State extends Dict<any>> = {
  [K in keyof State]: ReducerGeneratorBase<State[K], any>
}
export type ReducerGeneratorsForActionCreators<ActionCreators extends ReduxActionCreatorsDict> = {
  [K in keyof ActionCreators]: ReducerGeneratorBase<any, ActionCreators[K]>
}
export type ReducerPackagesForState<State extends Dict<any>> = {
  [K in keyof State]: ReducerPackage<State[K]>
}

export interface FuncArgs<Ts extends any[], TOut=any> {
  (...args: Ts): TOut
}
export type AsyncFuncArgs<Ts extends any[], TOut=any> = FuncArgs<Ts, Promise<TOut>>;
export type Combiner<Source, AdditionalSource, Target=Source> = FuncArgs<[Source, AdditionalSource],Target>

export type Nullable<T> = T | null;
export type NullableDict<T> = Dict<Nullable<T>>;
export type Dict<T> = Record<string, T>;
export type Indexer<T> = FuncArgs<[T],string>
export interface KeyValue<T>{
  key: string;
  value: T;
}

export interface IdentifiedModel {
  id?: string;
}

export function generateActionCreators<ActionCreators extends ReduxActionCreatorsDict>(generators: ReducerGeneratorsForActionCreators<ActionCreators>): ActionCreators {
  let actionCreators: Dict<ReduxActionCreators> = {};
  Object.keys(generators).forEach((key) => {
    actionCreators[key] = generators[key].extractActions();
  })
  return actionCreators as ActionCreators;
}

export function generateEpics(reducerPackages: Dict<ReducerPackage<any>>): SfEpic[] {
  let epics: SfEpic[] = []
  Object.keys(reducerPackages).forEach((key) => {
    epics = epics.concat(reducerPackages[key].getEpics())
  })
  return epics;
}

export function generateReducerPackages<State extends Dict<any>>(generators: ReducerGeneratorsForState<State>): ReducerPackagesForState<State> {
  let reducerPackages: Dict<ReducerPackage<any>> = {};
  Object.keys(generators).forEach((key) => {
    let reducerPackage = generators[key].getReducerPackage();
    reducerPackages[key] = reducerPackage;
  });
  return reducerPackages as ReducerPackagesForState<State>;
}

export function generateReducersWithDefault<State extends Dict<any>>(reducerPackages: ReducerPackagesForState<State>, defaultState: State): ReducersMapObject<State, PayloadedAction<any>> {
  let x: Dict<Reducer<any, PayloadedAction<any>>> = {}
  Object.keys(reducerPackages).forEach((key) => {
    x[key] = reducerPackages[key].generateReducer(defaultState[key])
  })
  return x as ReducersMapObject<State, PayloadedAction<any>>
}

export type ReducerGeneratorsForManager<RootState extends Dict<any>, ActionCreators extends ReduxActionCreatorsDict> 
= ReducerGeneratorsForState<RootState> & ReducerGeneratorsForActionCreators<ActionCreators>

export class ApiReduxManagerSetup<
  RootState extends Dict<any>,
  ActionCreators extends ReduxActionCreatorsDict,
  ReducerGenerators extends ReducerGeneratorsForManager<RootState, ActionCreators>>{
  private actionCreators: ActionCreators;
  private reducerGenerators: ReducerGenerators;
  private reducerPackages: ReducerPackagesForState<RootState>
  private epics: SfEpic[]
  createStoreEnhancer?: (e: StoreEnhancer) => StoreEnhancer
  extraMiddlewares: Middleware<{}, {}, any>[] = []
  withExtraEpics(epics: SfEpic[]) {
    this.epics = this.epics.concat(epics)
  }

  public getActionCreators(): ActionCreators{
    return this.actionCreators
  }

  public getReducerPackages(): ReducerPackagesForState<RootState>{
    return this.reducerPackages
  }

  public setGenerateStoreFunc(generateStore: StoreCreator ){
    this.generateStore = generateStore
    return this;
  }

  private generateStore: StoreCreator 

  constructor(reducerGenerators: ReducerGenerators) {
    this.reducerGenerators = reducerGenerators
    this.generateStore = createStore
    this.epics = []
    this.reducerPackages = generateReducerPackages<RootState>(this.reducerGenerators)
    this.actionCreators = generateActionCreators<ActionCreators>(this.reducerGenerators)
  }

  withExtraMiddlewares(extraMiddleWares: Middleware<{}, {}, any>[] = []) {
    this.extraMiddlewares = extraMiddleWares
    return this;
  }
  withCreateStoreEnhancer(createStoreEnhancer: (e: StoreEnhancer) => StoreEnhancer) {
    this.createStoreEnhancer = createStoreEnhancer
    return this;
  }

  run(defaultState: RootState, epicMiddleware?: EpicMiddleware<any, any>) {
    epicMiddleware = epicMiddleware || createEpicMiddleware();
    const reducers = generateReducersWithDefault<RootState>(this.reducerPackages, defaultState);
    const appliedMiddlewares = applyMiddleware(thunk, epicMiddleware, ...this.extraMiddlewares);
    const storeEnhancer = this.createStoreEnhancer ? this.createStoreEnhancer(appliedMiddlewares) : appliedMiddlewares
    const combinedReducers = combineReducers(reducers);
    const simpleStore: Store<RootState, any> = this.generateStore<RootState, PayloadedAction<any>, any, any>(combinedReducers, storeEnhancer);
    const epics = [
      ...generateEpics(this.reducerPackages),
      ...this.epics
    ]
    epicMiddleware.run(combineEpics(
      ...epics
    ));
    return simpleStore;
  }
}






