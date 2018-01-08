import * as Path from 'path';
import { Utils } from './Utils';
import * as shell from 'shelljs';

const inquirer =require('inquirer');
const fs = require('fs');
const ejs = require('ejs');
const unirest = require('unirest');

export class Executor {
    private state = {};
    private ctx;

    public get ejs() {
        return ejs;
    }

    public get shell() {
        return shell;
    }

    public get rest() {
        return unirest;
    }

    public get currentFolder() {
        return this._currentFolder;
    }

    public get commandFolder() {
        return this._commandFolder;
    }

    public get commandName() {
        return this.command.name;
    }

    constructor(private _commandFolder: string, private command: any, private _currentFolder:string) {
        this._commandFolder = Path.join(this._commandFolder, command.name);
    }

    public async execute(state?: any): Promise<string> {
        console.log("Loading context " + 'context');
        let ctx:any = await this.createContextAsync("", state);
        let nextCommand = await ctx.exec();
        return nextCommand;
    } 

    public async createContextAsync(folder:string, state) {
        let Context = require(Path.join(this._commandFolder, folder, 'context')).Context;
                    
        let ctx = new Context();
        ctx.state = Object.assign({}, state);
        ctx.context = this;
        await Promise.all([this.getPrompts(ctx)]);
        return ctx;
    }

    public getDirectories(templatesFolder: string=".") {
        return Utils.getDirectories(templatesFolder);
    }

    private async getPrompts(ctx) {
        if (!ctx.prompts)
            return;
        
        for (let prompt of ctx.prompts()) {
            if (prompt.then) {
                prompt = await prompt;
            }

            let retry = false;
            do {
                if (!ctx.state[prompt.name] || retry) {
                    let res = await inquirer.prompt([prompt]);
                    ctx.state[prompt.name] = res[prompt.name];
                    retry = false;
                }
                else if (prompt.validate) {
                    let msg = prompt.validate(ctx.state[prompt.name]);
                    if (typeof msg==="string") {
                        console.log(msg);
                        retry = true;
                    }
                }
                else
                    break;    
            }
            while (retry);
        }
    }
}
