import { ReducerPackage } from "../reducer";
import { Dict } from "sellfazz-ts-generic";
import { Dispatchable } from "../reducer/common";

export type ReduxActionCreators = Dict<Dispatchable>
export abstract class ReducerGeneratorBase<T, ActionCreators extends ReduxActionCreators>{
  protected abstract reducerPackage: ReducerPackage<T>;
  abstract extractActions(): ActionCreators;
  getReducerPackage(): ReducerPackage<T>{
    return this.reducerPackage;
  }
}

