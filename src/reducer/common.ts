import { AnyAction, Reducer, Dispatch } from "redux";
import { StateObservable, Epic } from "redux-observable";
import { ThunkAction } from "redux-thunk";
import { Combiner, AsyncFuncArgs, FuncArgs } from "./utils";

export interface PayloadedAction<Payload=any> extends AnyAction {
  payload: Payload
}
export interface PromisedThunkAction<TOut = any, RootState = any> extends ThunkAction<Promise<TOut>, RootState, any, AnyAction>{
}

export type SfEpic= Epic<AnyAction, PayloadedAction<any>>

export type PayloadedReducer<State, Payload> = Reducer<State, PayloadedAction<Payload>>;
export type PayloadedReduceMethod<State, Payload> = Combiner<State, Payload, State>;

export function getDirectReduxMethod<State>(): PayloadedReduceMethod<State, State> {
  return (s: State, pl: State) => pl;
} 

export type EpicMethod<Payload, RootState = any> = AsyncFuncArgs<[Payload, {}, StateObservable<RootState>, number?], PayloadedAction<any>[]>;
export const ByPassReduceMethod: PayloadedReduceMethod<any, any> = (s: any) => s;

export function makePayloadedAction<Payload>(actionName: string, payload: Payload): PayloadedAction<Payload> {
  return {
    type: actionName,
    payload
  }
};

export type PayloadedDispatch<Payload = any> = Dispatch<PayloadedAction<Payload>>;

export type PayloadedActionCreator<T extends any[], Payload=any> = FuncArgs<T, PayloadedAction<Payload>>;
export type SimplePayloadedActionCreator<Payload> = PayloadedActionCreator<[Payload], Payload>;
export type PromisedThunkActionCreator<T extends any[]=[], TOut = any, RootState = any> = FuncArgs<T, PromisedThunkAction<TOut, RootState>>

export type Dispatchable<Ts extends any[]=any, TOut=any> = PayloadedActionCreator<Ts> | PromisedThunkActionCreator<Ts, TOut>
export type SimpleDispatchable<TOut> = Dispatchable<[TOut], TOut>

export type GetDispatchableFunc = <Ts extends any[]=[], TOut=any>(name: string) => Dispatchable<Ts,TOut>