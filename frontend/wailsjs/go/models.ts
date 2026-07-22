export namespace main {
	
	export class ConnectionProfile {
	    id: string;
	    name: string;
	    server: string;
	    authType: string;
	    username?: string;
	    password?: string;
	    defaultDatabase?: string;
	    connectionString?: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionProfile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.server = source["server"];
	        this.authType = source["authType"];
	        this.username = source["username"];
	        this.password = source["password"];
	        this.defaultDatabase = source["defaultDatabase"];
	        this.connectionString = source["connectionString"];
	    }
	}
	export class ConnectionProfilesResponse {
	    profiles: ConnectionProfile[];
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionProfilesResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.profiles = this.convertValues(source["profiles"], ConnectionProfile);
	        this.message = source["message"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ConnectionResponse {
	    success: boolean;
	    message: string;
	    serverName: string;
	    databaseName: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.serverName = source["serverName"];
	        this.databaseName = source["databaseName"];
	    }
	}
	export class DatabasesResponse {
	    databases: string[];
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new DatabasesResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.databases = source["databases"];
	        this.message = source["message"];
	    }
	}
	export class DisconnectResponse {
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new DisconnectResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.message = source["message"];
	    }
	}
	export class ExecuteQueryResponse {
	    results: any[];
	    columns: string[];
	    message: string;
	    rowsAffected: number;
	    duration: string;
	
	    static createFrom(source: any = {}) {
	        return new ExecuteQueryResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.results = source["results"];
	        this.columns = source["columns"];
	        this.message = source["message"];
	        this.rowsAffected = source["rowsAffected"];
	        this.duration = source["duration"];
	    }
	}
	export class StatusInfo {
	    connected: boolean;
	    serverName: string;
	    databaseName: string;
	    executionTime: string;
	    rowsAffected: number;
	
	    static createFrom(source: any = {}) {
	        return new StatusInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connected = source["connected"];
	        this.serverName = source["serverName"];
	        this.databaseName = source["databaseName"];
	        this.executionTime = source["executionTime"];
	        this.rowsAffected = source["rowsAffected"];
	    }
	}
	export class TableSchemaColumn {
	    ColumnName: string;
	    DataType: string;
	    CharacterMaxLength?: number;
	    IsNullable: string;
	    IsPrimaryKey: boolean;
	    IsIdentity: boolean;
	
	    static createFrom(source: any = {}) {
	        return new TableSchemaColumn(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ColumnName = source["ColumnName"];
	        this.DataType = source["DataType"];
	        this.CharacterMaxLength = source["CharacterMaxLength"];
	        this.IsNullable = source["IsNullable"];
	        this.IsPrimaryKey = source["IsPrimaryKey"];
	        this.IsIdentity = source["IsIdentity"];
	    }
	}
	export class TableSchemaResponse {
	    schema: TableSchemaColumn[];
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new TableSchemaResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schema = this.convertValues(source["schema"], TableSchemaColumn);
	        this.message = source["message"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TablesResponse {
	    tables: string[];
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new TablesResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tables = source["tables"];
	        this.message = source["message"];
	    }
	}

}

