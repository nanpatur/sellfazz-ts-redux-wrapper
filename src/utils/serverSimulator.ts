import { IdentifiedModel } from "sellfazz-ts-daos";
import { generateId } from "../reducer/listReducerPackageGenerator";
import { Dict, Indexer } from 'sellfazz-ts-generic'

export function delay(timeout: number) {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, timeout);
  })
}

function copy<T>(item: T) {
  return JSON.parse(JSON.stringify(item)) as T;
}


export class ServerSimulator<T extends IdentifiedModel>{
  private dict: Dict<T>;
  private indexer: Indexer<T>;
  timeout: number;
  constructor(indexer: Indexer<T>, timeout: number) {
    this.indexer = indexer;
    this.dict = {}
    this.timeout = timeout;
  }

  setUpList(list: T[]) {
    this.dict = {};
    list.forEach((item: T) => {
      this.dict[this.indexer(item)] = item;
    })
  }

  getCopyOfDict(): Dict<T> {
    return copy<Dict<T>>(this.dict);
  }

  async getItem(id: string): Promise<T | undefined> {
    await delay(this.timeout);
    return copy<T>(this.dict[id]);
  }
  async getList(): Promise<T[]> {
    await delay(this.timeout);
    return Object.keys(this.dict).map((key) => copy<T>(this.dict[key]));
  }
  async updateItem(item: T): Promise<T> {
    item = copy<T>(item);
    await delay(this.timeout);
    this.dict[this.indexer(item)] = item;
    return copy<T>(item);
  }
  async updateList(list: T[]): Promise<T[]> {
    await delay(this.timeout);

    let updatedList: T[] = []
    list.forEach((item) => {
      item = copy<T>(item);
      if (this.dict[this.indexer(item)]) {
        this.dict[this.indexer(item)] = item;
        updatedList.push(item);
      }
    })
    return updatedList;
  }


  async deleteItem(item: T): Promise<void> {
    await delay(this.timeout);
    delete this.dict[this.indexer(item)];
  }

  async deleteList(list: T[]): Promise<T[]> {
    await delay(this.timeout);

    let deletedList: T[] = []
    list.forEach((item) => {
      item = copy<T>(item);
      if (this.dict[this.indexer(item)]) {
        deletedList.push(item)
      }
      delete this.dict[this.indexer(item)];
    })
    return deletedList;
  }


  async addItem(item: T): Promise<T> {
    item = copy<T>(item);
    await delay(this.timeout);
    let id = generateId("MOCK_ID_")
    item.id = id
    this.dict[id] = item;
    return item;
  }

  async addList(list: T[]): Promise<T[]> {
    await delay(this.timeout);
    let newList: T[] = []
    list.forEach(async (item) => {
      item = copy<T>(item);
      let id = generateId("MOCK_ID_")
      item.id = id
      this.dict[id] = item;
      newList.push(item);
    })
    return newList;
  }

}