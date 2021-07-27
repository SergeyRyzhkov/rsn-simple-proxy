import { plainToClass } from "class-transformer";
import * as fs from "fs";
import * as path from "path";

export class ConfigManager {
    private static _instance: ConfigManager;

    private configDir = "config";
    private configJson: any;
    private optionsMap = new Map();

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() {}

    public static get instance(): ConfigManager {
        if (!this._instance) {
            ConfigManager._instance = new ConfigManager();
            ConfigManager._instance.load();
        }
        return this._instance;
    }

    public load(): void {
        const filePath = this.getConfigFilePath();

        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir);
        }

        if (fs.existsSync(filePath)) {
            const configContent = fs.readFileSync(filePath, "utf8");
            this.configJson = JSON.parse(configContent);
        }

        if (!!this.configJson) {
            Object.keys(this.configJson).forEach((iterSection) => {
                this.optionsMap.set(iterSection, this.configJson[iterSection]);
            });
        }
    }

    public getOptionsAsClass<T>(ctor: new () => T): T {
        return plainToClass(ctor, this.configJson);
    }

    public getOptionsAsPlain(): any {
        return this.configJson;
    }

    public exists(configSection: string): boolean {
        return !!this.optionsMap.get(configSection);
    }

    private getConfigFilePath() {
        const fileName = process.env.NODE_ENV === "development" ? "dev.config.json" : "prod.config.json";
        return path.resolve(this.configDir, fileName);
    }
}
