import { ActionsObservable, StateObservable, ofType } from "redux-observable";
import { mergeMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { EpicMethod, PayloadedReduceMethod, makePayloadedAction, PayloadedReducer, PayloadedAction, PayloadedActionCreator, SimplePayloadedActionCreator, SfEpic } from "./common";
import { FuncArgs, Dict } from "sellfazz-ts-generic";
import { AnyAction } from "redux";

// export function generateEpicByNames<Payload, RootState = any>(actionNames: string[], func: EpicMethod<Payload, RootState>): SfEpic[] {
//   return actionNames.map((actionName) => generateEpicByName(actionName, func));
// }

// export function generateEpicByName<Payload, RootState = any>(actionName: string, func: EpicMethod<Payload, RootState>): SfEpic{
//   let actionObservables = ofType<AnyAction, PayloadedAction<Payload>>(actionName);
//   let epic = (action: ActionsObservable<AnyAction>, stateObservable: StateObservable<RootState>, dep: {}) => {
//     let mergeMappingPromiseList =  mergeMap((list: PayloadedAction<any>[]) => {
//       return of(...list);
//     });
//     let mergeMappingOfType = mergeMap<PayloadedAction<Payload>, PayloadedAction<any>>((action: PayloadedAction<Payload>, index: number) => {
//       return fromPromise<PayloadedAction<any>[]>(func(action.payload, dep, stateObservable, index)).pipe(
//         mergeMappingPromiseList,
//       );
//     });
//     return action.pipe<PayloadedAction<Payload>, PayloadedAction<any>>(actionObservables, mergeMappingOfType);
//   };
//   return epic;
// }

export class ActionPackage<State, Payload> {
  private reduceMethod: PayloadedReduceMethod<State, Payload>;
  private actionName: string;
  private epics: SfEpic[] = [];
  private actionCreators: Dict<PayloadedActionCreator<any[],Payload>> = {}
  private defaultActionCreator: SimplePayloadedActionCreator<Payload>

  constructor(actionName: string, reduceMethod: PayloadedReduceMethod<State, Payload>) {
    this.reduceMethod = reduceMethod;
    this.actionName = actionName;
    this.defaultActionCreator = this.generateActionCreator(null,(pl) => pl)
  }

  clone<AnotherState extends State>(): ActionPackage<AnotherState, Payload> {
    let actionPackage = new ActionPackage(this.actionName, (s: AnotherState, payload: Payload) => this.reduceMethod(s, payload) as AnotherState)
    actionPackage.epics = this.epics
    actionPackage.actionCreators = this.actionCreators
    actionPackage.defaultActionCreator = this.defaultActionCreator
    return actionPackage
  }

  getActionName(): string {
    return this.actionName;
  }

  getDefaultActionCreator(): SimplePayloadedActionCreator<Payload>{
    return this.defaultActionCreator;
  }

  getReducer(defaultState: State): PayloadedReducer<State, Payload> {
    return (state: State | undefined, action: PayloadedAction<Payload>): State => {
      defaultState = state || defaultState;
      if (action.type == this.actionName) {
        return this.reduceMethod(state || defaultState, action.payload)
      }
      return state || defaultState;
    }
  }

  getAction(payload: Payload): PayloadedAction<Payload> {
    return this.defaultActionCreator(payload) as PayloadedAction<Payload>;
  }

  generateActionCreator<Ts extends any[]=[Payload]>(name: string | null, payloadGenerator: FuncArgs<Ts,Payload>): PayloadedActionCreator<Ts, Payload>{
    let actionCreator = (...args: Ts) => {
      const payload = payloadGenerator(...args);
      return makePayloadedAction(this.actionName, payload);
    }
    let actionName = this.actionName;
    if(name){
      actionName = this.actionName+"."+name
    }
    this.actionCreators[actionName] = actionCreator as PayloadedActionCreator<any[],Payload>;
    return actionCreator; 
  }

  getReduceMethod(): PayloadedReduceMethod<State, Payload> {
    return this.reduceMethod;
  }

  getEpics(): SfEpic[] {
    return this.epics;
  }


  getActionCreators(): Dict<PayloadedActionCreator<any[],Payload>>{
    return this.actionCreators
  }

  // addEpic<RootState = any>(func: EpicMethod<Payload, RootState>){
  //   const epic = generateEpicByName<Payload, RootState>(this.actionName, func)
  //   this.epics.push(epic);
  //   return epic;
  // }

  // withEpic<RootState = any>(func: EpicMethod<Payload, RootState>): this {
  //   this.addEpic(func);    
  //   return this;
  // }
}
