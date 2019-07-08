import { Dict } from 'sellfazz-ts-generic';
import { ActionPackage, } from './actionPackage';
import { ByPassReduceMethod, PayloadedReduceMethod, PayloadedAction, EpicMethod, PayloadedActionCreator, PayloadedReducer, PromisedThunkActionCreator, SimplePayloadedActionCreator, Dispatchable, makePayloadedAction, SfEpic } from './common';

export class EpicCollections<RootState = any>{
  private epics: SfEpic[] = [];
  // withEpic<Payload>(func: EpicMethod<Payload, RootState>, actionNames: string[]): this {
  //   this.epics =this.epics.concat(generateEpicByNames<Payload, RootState>(actionNames, func));
  //   return this;
  // }
  getEpics(): SfEpic[] {
    return this.epics;
  }
}
export class ReducerPackage<State>{
  constructor() {
  }

  clone<AnotherState extends State>(): ReducerPackage<AnotherState>{
    let reducerPackage = new ReducerPackage<AnotherState>()
    Object.keys(this.actionPackageDict).forEach(key => {      
      reducerPackage.actionPackageDict[key] = this.actionPackageDict[key].clone<AnotherState>()
    })
    reducerPackage.thunks = this.thunks
    return reducerPackage
  }

  actionPackageDict: Dict<ActionPackage<State, any>> = {};
  thunks: Dict<PromisedThunkActionCreator<any[]>> = {};

  private getOrGenerateActionPackage<Payload>(actionName: string, handlerMethod?: PayloadedReduceMethod<State, Payload>): ActionPackage<State, Payload> {
    let actionPackage = this.actionPackageDict[actionName];
    if (!actionPackage) {
      const newHandlerMethod: PayloadedReduceMethod<State, Payload> = handlerMethod || ByPassReduceMethod;
      actionPackage = new ActionPackage<State, Payload>(actionName,newHandlerMethod);
      this.actionPackageDict[actionName] = actionPackage;
    }
    return actionPackage;
  }

  withHandler<Payload = any>(actionName: string, handlerMethod: PayloadedReduceMethod<State, Payload>): this {
    this.addHandler<Payload>(actionName, handlerMethod);
    return this;
  }

  addHandler<Payload = any>(actionName: string, handlerMethod: PayloadedReduceMethod<State, Payload>): SimplePayloadedActionCreator<Payload> {
    let actionPackage = this.getOrGenerateActionPackage<Payload>(actionName, handlerMethod);
    return actionPackage.getDefaultActionCreator();
  }

  withEpic<Payload, RootState = any>(actionName: string | string[], func: EpicMethod<Payload, RootState>): this {
    this.addEpic(actionName, func);
    return this;
  }
  addEpic<Payload, RootState = any>(actionName: string | string[], func: EpicMethod<Payload, RootState>): SimplePayloadedActionCreator<Payload>[] {
    let actionNames: string[] = [];
    switch (typeof actionName) {
      case 'string':
        actionNames.push(actionName as string);
        break;
      case 'object':
        actionNames = actionName as string[];
        break;
    }
    let actionCreators:SimplePayloadedActionCreator<Payload>[] = []
    actionNames.forEach((n) => {
      let actionPackage = this.getOrGenerateActionPackage<Payload>(n, ByPassReduceMethod);
      // actionPackage.addEpic(func);
      actionCreators.push((payload: Payload) => actionPackage.getAction(payload))
    })
    return actionCreators;
  }
  withActionPackage<Payload = any>(actionPackage: ActionPackage<State, Payload>) {
    this.addActionPackage(actionPackage);
    return this;
  }

  addActionPackage<Payload = any>(actionPackage: ActionPackage<State, Payload>): SimplePayloadedActionCreator<Payload> {
    let name = actionPackage.getActionName();
    this.actionPackageDict[name] = actionPackage;
    return (p: Payload) => actionPackage.getAction(p)
  }

  getEpics<Payload>(): SfEpic[] {
    let epics: SfEpic[] = [];
    Object.keys(this.actionPackageDict).forEach((key) => {
      let actionPackage = this.actionPackageDict[key];
      epics = epics.concat(actionPackage.getEpics());
    })
    return epics;
  }


  getActionCreators(): Dict<PayloadedActionCreator<any[]>>{
    let actionCreators: Dict<PayloadedActionCreator<any[]>> = {};
    Object.keys(this.actionPackageDict).forEach((key) => {
      let actionPackage = this.actionPackageDict[key];
      actionCreators = {
        ...actionCreators,
        ...actionPackage.getActionCreators()
      }
    })
    return actionCreators;
  }


  registerThunk<T extends any[], ReturnedObject=any, RootState = any>(thunkName: string, asyncThunkActionCreator: PromisedThunkActionCreator<T, ReturnedObject, RootState> ) 
  : PromisedThunkActionCreator<T, ReturnedObject, RootState>
  {
    this.thunks[thunkName] = asyncThunkActionCreator as PromisedThunkActionCreator<any[]>
    return asyncThunkActionCreator;
  }

  getThunkAs<T extends any[], ReturnedObject>(thunkName: string): PromisedThunkActionCreator<T, ReturnedObject> | undefined{
    if(!this.thunks[thunkName]){
      return undefined;
    }
    let x = this.thunks[thunkName];
    return x as PromisedThunkActionCreator<T, ReturnedObject>
  }

  getRegisteredActionNames() {
    return Object.keys(this.actionPackageDict);
  }

  getDispatchable<Ts extends any[]=[], TOut=any>(name: string): Dispatchable<Ts,TOut>{
    const actionCreators = this.getActionCreators();
    if(actionCreators[name]){
      return actionCreators[name] as PayloadedActionCreator<Ts>;
    }
    const promisedThunkActionCreator = this.getThunkAs<Ts, TOut>(name);
    if(promisedThunkActionCreator){
      return promisedThunkActionCreator;
    }

    let defaultCreator:PayloadedActionCreator<Ts> = (...args: Ts) => makePayloadedAction(name, null);
    return defaultCreator;
  }

  generateReducer(defaultState: State): PayloadedReducer<State, any> {
    return (state: State | undefined, action: PayloadedAction<any>) => {
      defaultState = state || defaultState;
      let actionHandlers: Dict<PayloadedReduceMethod<State, any>> = {
      }
      Object.keys(this.actionPackageDict).forEach((key) => {
        let actionPackage = this.actionPackageDict[key];
        actionHandlers[key] = actionPackage.getReduceMethod();
      })
      actionHandlers = {
        ...actionHandlers
      }
      if (!actionHandlers[action.type]) {
        return defaultState;
      }
      return actionHandlers[action.type](defaultState, action.payload);
    }
  }
}