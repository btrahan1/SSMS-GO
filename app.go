package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"

	_ "github.com/microsoft/go-mssqldb"
	_ "github.com/microsoft/go-mssqldb/namedpipe"
)

type DATA_BLOB struct {
	cbData uint32
	pbData *byte
}

func encryptPasswordDPAPI(plainText string) (string, error) {
	if plainText == "" {
		return "", nil
	}

	crypt32 := syscall.NewLazyDLL("crypt32.dll")
	procCryptProtectData := crypt32.NewProc("CryptProtectData")

	dataInBytes := []byte(plainText)
	var dataIn DATA_BLOB
	dataIn.cbData = uint32(len(dataInBytes))
	if len(dataInBytes) > 0 {
		dataIn.pbData = &dataInBytes[0]
	}

	var dataOut DATA_BLOB
	r, _, err := procCryptProtectData.Call(
		uintptr(unsafe.Pointer(&dataIn)),
		0, 0, 0, 0, 0,
		uintptr(unsafe.Pointer(&dataOut)),
	)
	if r == 0 {
		return "", fmt.Errorf("CryptProtectData failed: %v", err)
	}

	outBytes := unsafe.Slice(dataOut.pbData, dataOut.cbData)
	encoded := base64.StdEncoding.EncodeToString(outBytes)

	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	procLocalFree := kernel32.NewProc("LocalFree")
	procLocalFree.Call(uintptr(unsafe.Pointer(dataOut.pbData)))

	return "dpapi:" + encoded, nil
}

func decryptPasswordDPAPI(cipherText string) (string, error) {
	if cipherText == "" {
		return "", nil
	}

	if !strings.HasPrefix(cipherText, "dpapi:") {
		return cipherText, nil
	}

	rawB64 := strings.TrimPrefix(cipherText, "dpapi:")
	dataBytes, err := base64.StdEncoding.DecodeString(rawB64)
	if err != nil {
		return cipherText, err
	}

	crypt32 := syscall.NewLazyDLL("crypt32.dll")
	procCryptUnprotectData := crypt32.NewProc("CryptUnprotectData")

	var dataIn DATA_BLOB
	dataIn.cbData = uint32(len(dataBytes))
	if len(dataBytes) > 0 {
		dataIn.pbData = &dataBytes[0]
	}

	var dataOut DATA_BLOB
	r, _, err := procCryptUnprotectData.Call(
		uintptr(unsafe.Pointer(&dataIn)),
		0, 0, 0, 0, 0,
		uintptr(unsafe.Pointer(&dataOut)),
	)
	if r == 0 {
		return "", fmt.Errorf("CryptUnprotectData failed: %v", err)
	}

	outBytes := unsafe.Slice(dataOut.pbData, dataOut.cbData)
	result := string(outBytes)

	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	procLocalFree := kernel32.NewProc("LocalFree")
	procLocalFree.Call(uintptr(unsafe.Pointer(dataOut.pbData)))

	return result, nil
}

type ConnectionResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	ServerName   string `json:"serverName"`
	DatabaseName string `json:"databaseName"`
}

type DisconnectResponse struct {
	Message string `json:"message"`
}

type DatabasesResponse struct {
	Databases []string `json:"databases"`
	Message   string   `json:"message"`
}

type TablesResponse struct {
	Tables  []string `json:"tables"`
	Message string   `json:"message"`
}

type StoredProceduresResponse struct {
	Procedures []string `json:"procedures"`
	Message    string   `json:"message"`
}

type FunctionInfo struct {
	Name        string `json:"name"`
	RoutineType string `json:"routineType"`
}

type FunctionsResponse struct {
	Functions []FunctionInfo `json:"functions"`
	Message   string         `json:"message"`
}

type RoutineParameter struct {
	ParameterName      string `json:"parameterName"`
	DataType           string `json:"dataType"`
	CharacterMaxLength *int64 `json:"characterMaxLength,omitempty"`
	IsOutput           bool   `json:"isOutput"`
	OrdinalPosition    int    `json:"ordinalPosition"`
}

type RoutineParametersResponse struct {
	Parameters []RoutineParameter `json:"parameters"`
	Message    string             `json:"message"`
}

type RoutineDefinitionResponse struct {
	Definition  string `json:"definition"`
	RoutineType string `json:"routineType"`
	Message     string `json:"message"`
}

type TableSchemaColumn struct {
	ColumnName         string `json:"ColumnName"`
	DataType           string `json:"DataType"`
	CharacterMaxLength *int64 `json:"CharacterMaxLength,omitempty"`
	IsNullable         string `json:"IsNullable"`
	IsPrimaryKey       bool   `json:"IsPrimaryKey"`
	IsIdentity         bool   `json:"IsIdentity"`
}

type TableSchemaResponse struct {
	Schema  []TableSchemaColumn `json:"schema"`
	Message string              `json:"message"`
}

type TableDefinitionResponse struct {
	Definition string `json:"definition"`
	Message    string `json:"message"`
}

type QueryResultRow map[string]interface{}

type ExecuteQueryResponse struct {
	Results      []QueryResultRow `json:"results"`
	Columns      []string         `json:"columns"`
	Message      string           `json:"message"`
	RowsAffected int64            `json:"rowsAffected"`
	Duration     string           `json:"duration"`
}

// ConnectionProfile represents saved connection details
type ConnectionProfile struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Server           string `json:"server"`
	AuthType         string `json:"authType"` // "windows" or "sql"
	Username         string `json:"username,omitempty"`
	Password         string `json:"password,omitempty"`
	DefaultDatabase  string `json:"defaultDatabase,omitempty"`
	ConnectionString string `json:"connectionString,omitempty"`
}

type ConnectionProfilesResponse struct {
	Profiles []ConnectionProfile `json:"profiles"`
	Message  string              `json:"message"`
}

type StatusInfo struct {
	Connected     bool   `json:"connected"`
	ServerName    string `json:"serverName"`
	DatabaseName  string `json:"databaseName"`
	ExecutionTime string `json:"executionTime"`
	RowsAffected  int64  `json:"rowsAffected"`
}

type ServerConnectionHandle struct {
	ID         string
	ServerName string
	RawConnStr string
	DB         *sql.DB
	DBMap      map[string]*sql.DB
	DisableUse bool
}

type App struct {
	ctx              context.Context
	mu               sync.RWMutex
	db               *sql.DB
	servers          map[string]*ServerConnectionHandle
	isConnected      bool
	serverName       string
	databaseName     string
	executionTime    string
	rowsAffected     int64
	lastQueryStart   time.Time
	profilesFilePath string

	rawConnStr string
	dbMap      map[string]*sql.DB
}

func NewApp() *App {
	return &App{
		profilesFilePath: "connection_profiles.json",
		servers:          make(map[string]*ServerConnectionHandle),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetStatusInfo returns current connection and execution status
func (a *App) GetStatusInfo() StatusInfo {
	return StatusInfo{
		Connected:     a.isConnected,
		ServerName:    a.serverName,
		DatabaseName:  a.databaseName,
		ExecutionTime: a.executionTime,
		RowsAffected:  a.rowsAffected,
	}
}

func (a *App) buildConnStrForDatabase(dbName string) string {
	return a.buildConnStrWithRaw(a.rawConnStr, dbName)
}

func (a *App) getDbForDatabase(databaseName string) (*sql.DB, error) {
	handle, err := a.getServerHandle("")
	if err != nil {
		return nil, err
	}
	return a.getDbForDatabaseOnServer(handle, databaseName)
}

func (a *App) ConnectServerWithId(id string, connStr string, serverName string, dbName string) ConnectionResponse {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.servers == nil {
		a.servers = make(map[string]*ServerConnectionHandle)
	}

	if existing, found := a.servers[id]; found && existing != nil {
		closed := make(map[*sql.DB]bool)
		if existing.DB != nil {
			existing.DB.Close()
			closed[existing.DB] = true
		}
		if existing.DBMap != nil {
			for _, db := range existing.DBMap {
				if db != nil && !closed[db] {
					db.Close()
					closed[db] = true
				}
			}
		}
	}

	db, err := sql.Open("mssql", connStr)
	if err != nil {
		return ConnectionResponse{Success: false, Message: fmt.Sprintf("Failed to create connection: %v", err)}
	}

	err = db.PingContext(a.ctx)
	if err != nil {
		db.Close()
		return ConnectionResponse{Success: false, Message: fmt.Sprintf("Failed to ping server %s: %v", serverName, err)}
	}

	handle := &ServerConnectionHandle{
		ID:         id,
		ServerName: serverName,
		RawConnStr: connStr,
		DB:         db,
		DBMap:      make(map[string]*sql.DB),
	}
	handle.DBMap[""] = db
	if dbName != "" {
		handle.DBMap[dbName] = db
	}

	a.servers[id] = handle

	a.db = db
	a.rawConnStr = connStr
	a.dbMap = handle.DBMap
	a.isConnected = true
	a.serverName = serverName
	a.databaseName = dbName

	return ConnectionResponse{
		Success:      true,
		Message:      "Connected successfully",
		ServerName:   serverName,
		DatabaseName: dbName,
	}
}

func (a *App) DisconnectServerWithId(id string) DisconnectResponse {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.servers != nil {
		if handle, found := a.servers[id]; found && handle != nil {
			closed := make(map[*sql.DB]bool)
			if handle.DB != nil {
				handle.DB.Close()
				closed[handle.DB] = true
			}
			if handle.DBMap != nil {
				for _, db := range handle.DBMap {
					if db != nil && !closed[db] {
						db.Close()
						closed[db] = true
					}
				}
			}
			delete(a.servers, id)
		}
	}
	if len(a.servers) == 0 {
		a.db = nil
		a.isConnected = false
		a.serverName = ""
		a.databaseName = ""
	}
	return DisconnectResponse{Message: "Server disconnected."}
}

func (a *App) getServerHandle(serverId string) (*ServerConnectionHandle, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if serverId == "" {
		if len(a.servers) > 0 {
			for _, h := range a.servers {
				return h, nil
			}
		}
		if a.db != nil {
			return &ServerConnectionHandle{
				ID:         "default",
				ServerName: a.serverName,
				RawConnStr: a.rawConnStr,
				DB:         a.db,
				DBMap:      a.dbMap,
			}, nil
		}
		return nil, fmt.Errorf("Not connected to a SQL Server.")
	}

	if a.servers != nil {
		if handle, exists := a.servers[serverId]; exists && handle != nil {
			return handle, nil
		}
	}
	return nil, fmt.Errorf("Server connection not found.")
}

func (a *App) getDbForDatabaseOnServer(handle *ServerConnectionHandle, databaseName string) (*sql.DB, error) {
	if handle == nil || handle.DB == nil {
		return nil, fmt.Errorf("Not connected to a SQL Server.")
	}

	if databaseName == "" {
		return handle.DB, nil
	}

	a.mu.RLock()
	if handle.DBMap != nil {
		if targetDb, exists := handle.DBMap[databaseName]; exists && targetDb != nil {
			a.mu.RUnlock()
			return targetDb, nil
		}
	}
	a.mu.RUnlock()

	isAzureDomain := strings.Contains(strings.ToLower(handle.ServerName), ".database.windows.net") ||
		strings.Contains(strings.ToLower(handle.RawConnStr), ".database.windows.net")

	if !handle.DisableUse && !isAzureDomain {
		ctx, cancel := context.WithTimeout(a.ctx, 2*time.Second)
		conn, err := handle.DB.Conn(ctx)
		if err == nil {
			_, useErr := conn.ExecContext(ctx, fmt.Sprintf("USE [%s];", databaseName))
			conn.Close()
			cancel()
			if useErr == nil {
				a.mu.Lock()
				if handle.DBMap == nil {
					handle.DBMap = make(map[string]*sql.DB)
				}
				handle.DBMap[databaseName] = handle.DB
				a.mu.Unlock()
				return handle.DB, nil
			}
		} else {
			cancel()
		}
		handle.DisableUse = true
	} else {
		handle.DisableUse = true
	}

	log.Printf("Creating isolated connection pool for server [%s] database [%s]...", handle.ServerName, databaseName)
	targetConnStr := a.buildConnStrWithRaw(handle.RawConnStr, databaseName)
	targetDb, err := sql.Open("mssql", targetConnStr)
	if err != nil {
		return nil, fmt.Errorf("Error opening connection for database %s: %v", databaseName, err)
	}

	pingCtx, pingCancel := context.WithTimeout(a.ctx, 10*time.Second)
	defer pingCancel()

	err = targetDb.PingContext(pingCtx)
	if err != nil {
		targetDb.Close()
		return nil, fmt.Errorf("Error pinging database %s: %v", databaseName, err)
	}

	a.mu.Lock()
	if handle.DBMap == nil {
		handle.DBMap = make(map[string]*sql.DB)
	}
	handle.DBMap[databaseName] = targetDb
	a.mu.Unlock()
	return targetDb, nil
}

func (a *App) buildConnStrWithRaw(rawConnStr, dbName string) string {
	if rawConnStr == "" || dbName == "" {
		return rawConnStr
	}

	parts := strings.Split(rawConnStr, ";")
	var newParts []string
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		kv := strings.SplitN(trimmed, "=", 2)
		key := strings.TrimSpace(strings.ToLower(kv[0]))
		if key == "database" || key == "initial catalog" || key == "catalog" {
			continue
		}
		newParts = append(newParts, trimmed)
	}
	newParts = append(newParts, fmt.Sprintf("database=%s", dbName))
	return strings.Join(newParts, ";")
}

func (a *App) ListDatabasesForServer(serverId string) DatabasesResponse {
	handle, err := a.getServerHandle(serverId)
	if err != nil {
		return DatabasesResponse{Databases: []string{}, Message: err.Error()}
	}

	rows, err := handle.DB.QueryContext(a.ctx, "SELECT name FROM sys.databases WHERE name NOT IN ('tempdb') ORDER BY name")
	if err != nil {
		log.Printf("Error listing databases for server %s: %v", handle.ServerName, err)
		fallback := []string{"master"}
		return DatabasesResponse{Databases: fallback, Message: fmt.Sprintf("Fallback databases: %v", err)}
	}
	defer rows.Close()

	var databases []string
	for rows.Next() {
		var dbName string
		if err := rows.Scan(&dbName); err == nil {
			databases = append(databases, dbName)
		}
	}
	if len(databases) == 0 {
		databases = []string{"master"}
	}
	return DatabasesResponse{Databases: databases, Message: "Successfully retrieved databases."}
}

func (a *App) ListTablesForServer(serverId string, databaseName string) TablesResponse {
	handle, err := a.getServerHandle(serverId)
	if err != nil {
		return TablesResponse{Tables: []string{}, Message: err.Error()}
	}

	targetDb, err := a.getDbForDatabaseOnServer(handle, databaseName)
	if err != nil {
		return TablesResponse{Tables: []string{}, Message: fmt.Sprintf("Error connecting to database %s: %v", databaseName, err)}
	}

	conn, err := targetDb.Conn(a.ctx)
	if err != nil {
		return TablesResponse{Tables: []string{}, Message: fmt.Sprintf("Error getting connection: %v", err)}
	}
	defer conn.Close()

	if databaseName != "" && targetDb == handle.DB {
		_, _ = conn.ExecContext(a.ctx, fmt.Sprintf("USE [%s];", databaseName))
	}

	query := "SELECT TABLE_SCHEMA + '.' + TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME"
	rows, err := conn.QueryContext(a.ctx, query)
	if err != nil {
		return TablesResponse{Tables: []string{}, Message: fmt.Sprintf("Error listing tables for database %s: %v", databaseName, err)}
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err == nil {
			tables = append(tables, tableName)
		}
	}
	return TablesResponse{Tables: tables, Message: fmt.Sprintf("Successfully retrieved tables for database %s.", databaseName)}
}

func (a *App) GetTableSchemaForServer(serverId string, databaseName, tableName string) TableSchemaResponse {
	handle, err := a.getServerHandle(serverId)
	if err != nil {
		return TableSchemaResponse{Schema: []TableSchemaColumn{}, Message: err.Error()}
	}

	targetDb, err := a.getDbForDatabaseOnServer(handle, databaseName)
	if err != nil {
		return TableSchemaResponse{Schema: []TableSchemaColumn{}, Message: fmt.Sprintf("Error connecting to database %s: %v", databaseName, err)}
	}

	schemaParts := splitTableName(tableName)
	if len(schemaParts) != 2 {
		return TableSchemaResponse{Schema: []TableSchemaColumn{}, Message: "Invalid table name format. Expected 'schema.table'."}
	}
	tableSchema := schemaParts[0]
	actualTableName := schemaParts[1]

	conn, err := targetDb.Conn(a.ctx)
	if err != nil {
		return TableSchemaResponse{Schema: []TableSchemaColumn{}, Message: fmt.Sprintf("Error getting connection: %v", err)}
	}
	defer conn.Close()

	if databaseName != "" && targetDb == handle.DB {
		_, _ = conn.ExecContext(a.ctx, fmt.Sprintf("USE [%s];", databaseName))
	}

	query := `
		SELECT
			c.COLUMN_NAME,
			c.DATA_TYPE,
			c.CHARACTER_MAXIMUM_LENGTH,
			c.IS_NULLABLE,
			CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS IsPrimaryKey,
			CASE WHEN sc.is_identity = 1 THEN 1 ELSE 0 END AS IsIdentity
		FROM
			INFORMATION_SCHEMA.COLUMNS c
		LEFT JOIN
			sys.columns sc ON c.COLUMN_NAME = sc.name
			AND OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME)) = sc.object_id
		LEFT JOIN (
			SELECT
				ku.TABLE_SCHEMA,
				ku.TABLE_NAME,
				ku.COLUMN_NAME
			FROM
				INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
			INNER JOIN
				INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku
				ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
			WHERE
				tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
		) AS pk ON c.COLUMN_NAME = pk.COLUMN_NAME
			AND c.TABLE_SCHEMA = pk.TABLE_SCHEMA
			AND c.TABLE_NAME = pk.TABLE_NAME
		WHERE
			c.TABLE_NAME = @tableName AND c.TABLE_SCHEMA = @tableSchema
		ORDER BY
			c.ORDINAL_POSITION;
	`

	rows, err := conn.QueryContext(a.ctx, query, sql.Named("tableName", actualTableName), sql.Named("tableSchema", tableSchema))
	if err != nil {
		return TableSchemaResponse{Schema: []TableSchemaColumn{}, Message: fmt.Sprintf("Error getting schema: %v", err)}
	}
	defer rows.Close()

	var schema []TableSchemaColumn
	for rows.Next() {
		var colName, dataType, isNullable string
		var charMaxLength sql.NullInt64
		var isPrimaryKey bool
		var isIdentity bool
		var column TableSchemaColumn

		if err := rows.Scan(&colName, &dataType, &charMaxLength, &isNullable, &isPrimaryKey, &isIdentity); err == nil {
			column.ColumnName = colName
			column.DataType = dataType
			column.IsNullable = isNullable
			column.IsPrimaryKey = isPrimaryKey
			column.IsIdentity = isIdentity
			if charMaxLength.Valid {
				column.CharacterMaxLength = &charMaxLength.Int64
			}
			schema = append(schema, column)
		}
	}
	if schema == nil {
		schema = []TableSchemaColumn{}
	}
	return TableSchemaResponse{Schema: schema, Message: fmt.Sprintf("Successfully retrieved schema for table %s.", tableName)}
}

func (a *App) GetTableDefinitionForServer(serverId string, databaseName, tableName string) TableDefinitionResponse {
	schemaRes := a.GetTableSchemaForServer(serverId, databaseName, tableName)
	if len(schemaRes.Schema) == 0 {
		return TableDefinitionResponse{Definition: "", Message: fmt.Sprintf("Could not retrieve schema for table %s", tableName)}
	}

	parts := splitTableName(tableName)
	tableSchema := parts[0]
	actualTableName := parts[1]

	var colDefs []string
	var pkCols []string

	for _, col := range schemaRes.Schema {
		var colDef strings.Builder
		colDef.WriteString(fmt.Sprintf("    [%s] %s", col.ColumnName, strings.ToUpper(col.DataType)))

		dType := strings.ToLower(col.DataType)
		if col.CharacterMaxLength != nil && (dType == "varchar" || dType == "nvarchar" || dType == "char" || dType == "nchar" || dType == "binary" || dType == "varbinary") {
			if *col.CharacterMaxLength == -1 {
				colDef.WriteString("(MAX)")
			} else {
				colDef.WriteString(fmt.Sprintf("(%d)", *col.CharacterMaxLength))
			}
		}

		if col.IsIdentity {
			colDef.WriteString(" IDENTITY(1,1)")
		}

		if strings.ToUpper(col.IsNullable) == "NO" {
			colDef.WriteString(" NOT NULL")
		} else {
			colDef.WriteString(" NULL")
		}

		colDefs = append(colDefs, colDef.String())

		if col.IsPrimaryKey {
			pkCols = append(pkCols, fmt.Sprintf("[%s] ASC", col.ColumnName))
		}
	}

	if len(pkCols) > 0 {
		pkConstraint := fmt.Sprintf("    CONSTRAINT [PK_%s] PRIMARY KEY CLUSTERED (%s)", actualTableName, strings.Join(pkCols, ", "))
		colDefs = append(colDefs, pkConstraint)
	}

	var sb strings.Builder
	if databaseName != "" {
		sb.WriteString(fmt.Sprintf("USE [%s];\nGO\n\n", databaseName))
	}
	sb.WriteString(fmt.Sprintf("CREATE TABLE [%s].[%s] (\n", tableSchema, actualTableName))
	sb.WriteString(strings.Join(colDefs, ",\n"))
	sb.WriteString("\n);\nGO\n")

	return TableDefinitionResponse{
		Definition: sb.String(),
		Message:    fmt.Sprintf("Successfully generated CREATE TABLE definition for %s.", tableName),
	}
}

func (a *App) ListStoredProceduresForServer(serverId string, databaseName string) StoredProceduresResponse {
	handle, err := a.getServerHandle(serverId)
	if err != nil {
		return StoredProceduresResponse{Procedures: []string{}, Message: err.Error()}
	}

	targetDb, err := a.getDbForDatabaseOnServer(handle, databaseName)
	if err != nil {
		return StoredProceduresResponse{Procedures: []string{}, Message: fmt.Sprintf("Error connecting to database %s: %v", databaseName, err)}
	}

	conn, err := targetDb.Conn(a.ctx)
	if err != nil {
		return StoredProceduresResponse{Procedures: []string{}, Message: fmt.Sprintf("Error getting connection: %v", err)}
	}
	defer conn.Close()

	if databaseName != "" && targetDb == handle.DB {
		_, _ = conn.ExecContext(a.ctx, fmt.Sprintf("USE [%s];", databaseName))
	}

	query := "SELECT ROUTINE_SCHEMA + '.' + ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE = 'PROCEDURE' ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME"
	rows, err := conn.QueryContext(a.ctx, query)
	if err != nil {
		return StoredProceduresResponse{Procedures: []string{}, Message: fmt.Sprintf("Error listing stored procedures for database %s: %v", databaseName, err)}
	}
	defer rows.Close()

	var procedures []string
	for rows.Next() {
		var procName string
		if err := rows.Scan(&procName); err == nil {
			procedures = append(procedures, procName)
		}
	}
	if procedures == nil {
		procedures = []string{}
	}
	return StoredProceduresResponse{Procedures: procedures, Message: fmt.Sprintf("Successfully retrieved stored procedures for database %s.", databaseName)}
}

func (a *App) ListFunctionsForServer(serverId string, databaseName string) FunctionsResponse {
	handle, err := a.getServerHandle(serverId)
	if err != nil {
		return FunctionsResponse{Functions: []FunctionInfo{}, Message: err.Error()}
	}

	targetDb, err := a.getDbForDatabaseOnServer(handle, databaseName)
	if err != nil {
		return FunctionsResponse{Functions: []FunctionInfo{}, Message: fmt.Sprintf("Error connecting to database %s: %v", databaseName, err)}
	}

	conn, err := targetDb.Conn(a.ctx)
	if err != nil {
		return FunctionsResponse{Functions: []FunctionInfo{}, Message: fmt.Sprintf("Error getting connection: %v", err)}
	}
	defer conn.Close()

	if databaseName != "" && targetDb == handle.DB {
		_, _ = conn.ExecContext(a.ctx, fmt.Sprintf("USE [%s];", databaseName))
	}

	query := `
		SELECT 
			r.ROUTINE_SCHEMA + '.' + r.ROUTINE_NAME AS RoutineName,
			CASE 
				WHEN o.type IN ('IF', 'TF', 'FT') THEN 'Table-valued'
				ELSE 'Scalar'
			END AS RoutineType
		FROM INFORMATION_SCHEMA.ROUTINES r
		LEFT JOIN sys.objects o ON OBJECT_ID(QUOTENAME(r.ROUTINE_SCHEMA) + '.' + QUOTENAME(r.ROUTINE_NAME)) = o.object_id
		WHERE r.ROUTINE_TYPE = 'FUNCTION'
		ORDER BY r.ROUTINE_SCHEMA, r.ROUTINE_NAME
	`
	rows, err := conn.QueryContext(a.ctx, query)
	if err != nil {
		return FunctionsResponse{Functions: []FunctionInfo{}, Message: fmt.Sprintf("Error listing functions for database %s: %v", databaseName, err)}
	}
	defer rows.Close()

	var functions []FunctionInfo
	for rows.Next() {
		var name, routineType string
		if err := rows.Scan(&name, &routineType); err == nil {
			functions = append(functions, FunctionInfo{Name: name, RoutineType: routineType})
		}
	}
	if functions == nil {
		functions = []FunctionInfo{}
	}
	return FunctionsResponse{Functions: functions, Message: fmt.Sprintf("Successfully retrieved functions for database %s.", databaseName)}
}

func (a *App) GetRoutineParametersForServer(serverId string, databaseName, routineName string) RoutineParametersResponse {
	handle, err := a.getServerHandle(serverId)
	if err != nil {
		return RoutineParametersResponse{Parameters: []RoutineParameter{}, Message: err.Error()}
	}

	targetDb, err := a.getDbForDatabaseOnServer(handle, databaseName)
	if err != nil {
		return RoutineParametersResponse{Parameters: []RoutineParameter{}, Message: fmt.Sprintf("Error connecting to database %s: %v", databaseName, err)}
	}

	schemaParts := splitTableName(routineName)
	if len(schemaParts) != 2 {
		return RoutineParametersResponse{Parameters: []RoutineParameter{}, Message: "Invalid routine name format. Expected 'schema.routine'."}
	}
	rSchema := schemaParts[0]
	rName := schemaParts[1]

	conn, err := targetDb.Conn(a.ctx)
	if err != nil {
		return RoutineParametersResponse{Parameters: []RoutineParameter{}, Message: fmt.Sprintf("Error getting connection: %v", err)}
	}
	defer conn.Close()

	if databaseName != "" && targetDb == handle.DB {
		_, _ = conn.ExecContext(a.ctx, fmt.Sprintf("USE [%s];", databaseName))
	}

	query := `
		SELECT 
			p.PARAMETER_NAME,
			p.DATA_TYPE,
			p.CHARACTER_MAXIMUM_LENGTH,
			CASE WHEN p.PARAMETER_MODE LIKE '%OUT%' THEN 1 ELSE 0 END AS IsOutput,
			p.ORDINAL_POSITION
		FROM INFORMATION_SCHEMA.PARAMETERS p
		WHERE p.SPECIFIC_SCHEMA = @routineSchema AND p.SPECIFIC_NAME = @routineName AND p.PARAMETER_NAME <> ''
		ORDER BY p.ORDINAL_POSITION;
	`

	rows, err := conn.QueryContext(a.ctx, query, sql.Named("routineSchema", rSchema), sql.Named("routineName", rName))
	if err != nil {
		return RoutineParametersResponse{Parameters: []RoutineParameter{}, Message: fmt.Sprintf("Error getting parameters: %v", err)}
	}
	defer rows.Close()

	var parameters []RoutineParameter
	for rows.Next() {
		var paramName, dataType string
		var charMaxLength sql.NullInt64
		var isOutput bool
		var ordinalPos int

		if err := rows.Scan(&paramName, &dataType, &charMaxLength, &isOutput, &ordinalPos); err == nil {
			param := RoutineParameter{
				ParameterName:   paramName,
				DataType:        dataType,
				IsOutput:        isOutput,
				OrdinalPosition: ordinalPos,
			}
			if charMaxLength.Valid {
				param.CharacterMaxLength = &charMaxLength.Int64
			}
			parameters = append(parameters, param)
		}
	}
	if parameters == nil {
		parameters = []RoutineParameter{}
	}
	return RoutineParametersResponse{Parameters: parameters, Message: fmt.Sprintf("Successfully retrieved parameters for %s.", routineName)}
}

func (a *App) GetRoutineDefinitionForServer(serverId string, databaseName, routineName string) RoutineDefinitionResponse {
	handle, err := a.getServerHandle(serverId)
	if err != nil {
		return RoutineDefinitionResponse{Definition: "", Message: err.Error()}
	}

	targetDb, err := a.getDbForDatabaseOnServer(handle, databaseName)
	if err != nil {
		return RoutineDefinitionResponse{Definition: "", Message: fmt.Sprintf("Error connecting to database %s: %v", databaseName, err)}
	}

	schemaParts := splitTableName(routineName)
	if len(schemaParts) != 2 {
		return RoutineDefinitionResponse{Definition: "", Message: "Invalid routine name format. Expected 'schema.routine'."}
	}
	rSchema := schemaParts[0]
	rName := schemaParts[1]

	conn, err := targetDb.Conn(a.ctx)
	if err != nil {
		return RoutineDefinitionResponse{Definition: "", Message: fmt.Sprintf("Error getting connection: %v", err)}
	}
	defer conn.Close()

	if databaseName != "" && targetDb == handle.DB {
		_, _ = conn.ExecContext(a.ctx, fmt.Sprintf("USE [%s];", databaseName))
	}

	query := `
		SELECT 
			COALESCE(OBJECT_DEFINITION(OBJECT_ID(QUOTENAME(@routineSchema) + '.' + QUOTENAME(@routineName))), m.definition, '') AS Definition,
			o.type_desc AS RoutineType
		FROM sys.objects o
		LEFT JOIN sys.sql_modules m ON o.object_id = m.object_id
		WHERE o.object_id = OBJECT_ID(QUOTENAME(@routineSchema) + '.' + QUOTENAME(@routineName))
	`

	var definition, routineType string
	err = conn.QueryRowContext(a.ctx, query, sql.Named("routineSchema", rSchema), sql.Named("routineName", rName)).Scan(&definition, &routineType)
	if err != nil {
		return RoutineDefinitionResponse{Definition: "", Message: fmt.Sprintf("Error fetching definition for %s: %v", routineName, err)}
	}

	return RoutineDefinitionResponse{
		Definition:  definition,
		RoutineType: routineType,
		Message:     fmt.Sprintf("Successfully retrieved definition for %s.", routineName),
	}
}

func (a *App) ExecuteQueryForServer(serverId string, databaseName, query string) ExecuteQueryResponse {
	handle, err := a.getServerHandle(serverId)
	if err != nil {
		return ExecuteQueryResponse{Results: []QueryResultRow{}, Columns: []string{}, Message: err.Error()}
	}

	targetDb, err := a.getDbForDatabaseOnServer(handle, databaseName)
	if err != nil {
		return ExecuteQueryResponse{Results: []QueryResultRow{}, Columns: []string{}, Message: fmt.Sprintf("Error connecting to database %s: %v", databaseName, err)}
	}

	a.lastQueryStart = time.Now()

	conn, err := targetDb.Conn(a.ctx)
	if err != nil {
		return ExecuteQueryResponse{Results: []QueryResultRow{}, Columns: []string{}, Message: fmt.Sprintf("Error getting connection: %v", err)}
	}
	defer conn.Close()

	if databaseName != "" && targetDb == handle.DB {
		_, err = conn.ExecContext(a.ctx, fmt.Sprintf("USE [%s];", databaseName))
		if err != nil {
			return ExecuteQueryResponse{Results: []QueryResultRow{}, Columns: []string{}, Message: fmt.Sprintf("Error switching database: %v", err)}
		}
	}

	rows, err := conn.QueryContext(a.ctx, query)
	if err != nil {
		duration := time.Since(a.lastQueryStart).String()
		a.executionTime = duration
		return ExecuteQueryResponse{Results: []QueryResultRow{}, Columns: []string{}, Message: fmt.Sprintf("Error executing query: %v", err), Duration: duration}
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		duration := time.Since(a.lastQueryStart).String()
		a.executionTime = duration
		return ExecuteQueryResponse{Results: []QueryResultRow{}, Columns: []string{}, Message: fmt.Sprintf("Error getting columns: %v", err), Duration: duration}
	}

	var results []QueryResultRow
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			duration := time.Since(a.lastQueryStart).String()
			a.executionTime = duration
			return ExecuteQueryResponse{Results: []QueryResultRow{}, Columns: []string{}, Message: fmt.Sprintf("Error scanning row: %v", err), Duration: duration}
		}

		rowMap := make(QueryResultRow)
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				rowMap[col] = string(b)
			} else {
				rowMap[col] = val
			}
		}
		results = append(results, rowMap)
	}

	duration := time.Since(a.lastQueryStart).String()
	a.executionTime = duration
	a.rowsAffected = int64(len(results))
	a.serverName = handle.ServerName
	a.databaseName = databaseName

	return ExecuteQueryResponse{
		Results:      results,
		Columns:      columns,
		Message:      "Query executed successfully.",
		RowsAffected: int64(len(results)),
		Duration:     duration,
	}
}

func (a *App) ExecuteNonQueryForServer(serverId string, databaseName, query string) ExecuteQueryResponse {
	return a.ExecuteQueryForServer(serverId, databaseName, query)
}

func (a *App) ConnectSQLServer(connectionString string) ConnectionResponse {
	return a.ConnectServerWithId("default", connectionString, connectionString, "")
}

func (a *App) DisconnectSQLServer() DisconnectResponse {
	return a.DisconnectServerWithId("default")
}

func (a *App) ListDatabases() DatabasesResponse {
	return a.ListDatabasesForServer("")
}

func (a *App) ListTables(databaseName string) TablesResponse {
	return a.ListTablesForServer("", databaseName)
}

func (a *App) GetTableSchema(databaseName, tableName string) TableSchemaResponse {
	return a.GetTableSchemaForServer("", databaseName, tableName)
}

func (a *App) ListStoredProcedures(databaseName string) StoredProceduresResponse {
	return a.ListStoredProceduresForServer("", databaseName)
}

func (a *App) ListFunctions(databaseName string) FunctionsResponse {
	return a.ListFunctionsForServer("", databaseName)
}

func (a *App) GetRoutineParameters(databaseName, routineName string) RoutineParametersResponse {
	return a.GetRoutineParametersForServer("", databaseName, routineName)
}

func (a *App) GetRoutineDefinition(databaseName, routineName string) RoutineDefinitionResponse {
	return a.GetRoutineDefinitionForServer("", databaseName, routineName)
}

func (a *App) ExecuteQuery(databaseName, query string) ExecuteQueryResponse {
	return a.ExecuteQueryForServer("", databaseName, query)
}

func (a *App) ExecuteNonQuery(databaseName, query string) ExecuteQueryResponse {
	return a.ExecuteNonQueryForServer("", databaseName, query)
}

// --- Connection Profile Methods ---

// ListConnectionProfiles reads and returns all saved connection profiles from file
func (a *App) ListConnectionProfiles() ConnectionProfilesResponse {
	a.mu.RLock()
	filePath := a.profilesFilePath
	a.mu.RUnlock()

	data, err := os.ReadFile(filePath)
	if err != nil {
		return ConnectionProfilesResponse{
			Profiles: []ConnectionProfile{},
			Message:  "No profiles found",
		}
	}
	var profiles []ConnectionProfile
	if err := json.Unmarshal(data, &profiles); err != nil {
		return ConnectionProfilesResponse{
			Profiles: []ConnectionProfile{},
			Message:  fmt.Sprintf("Error reading profiles: %v", err),
		}
	}
	if profiles == nil {
		profiles = []ConnectionProfile{}
	}

	for i := range profiles {
		if profiles[i].Password != "" {
			decrypted, err := decryptPasswordDPAPI(profiles[i].Password)
			if err == nil {
				profiles[i].Password = decrypted
			}
		}
	}

	return ConnectionProfilesResponse{
		Profiles: profiles,
		Message:  "Profiles loaded",
	}
}

// SaveConnectionProfile saves a connection profile (creates or updates)
func (a *App) SaveConnectionProfile(profile ConnectionProfile) ConnectionProfilesResponse {
	profileToSave := profile
	if profileToSave.Password != "" {
		encrypted, err := encryptPasswordDPAPI(profileToSave.Password)
		if err == nil {
			profileToSave.Password = encrypted
		}
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	var profiles []ConnectionProfile
	data, err := os.ReadFile(a.profilesFilePath)
	if err == nil {
		json.Unmarshal(data, &profiles)
	}
	if profiles == nil {
		profiles = []ConnectionProfile{}
	}

	found := false
	for i, p := range profiles {
		if p.ID == profileToSave.ID {
			profiles[i] = profileToSave
			found = true
			break
		}
	}
	if !found {
		profiles = append(profiles, profileToSave)
	}

	if err := a.saveProfiles(profiles); err != nil {
		return ConnectionProfilesResponse{
			Profiles: profiles,
			Message:  fmt.Sprintf("Error saving profile: %v", err),
		}
	}

	for i := range profiles {
		if profiles[i].Password != "" {
			decrypted, err := decryptPasswordDPAPI(profiles[i].Password)
			if err == nil {
				profiles[i].Password = decrypted
			}
		}
	}

	return ConnectionProfilesResponse{
		Profiles: profiles,
		Message:  "Profile saved",
	}
}

// DeleteConnectionProfile removes a connection profile by ID
func (a *App) DeleteConnectionProfile(id string) ConnectionProfilesResponse {
	a.mu.Lock()
	defer a.mu.Unlock()

	var profiles []ConnectionProfile
	data, err := os.ReadFile(a.profilesFilePath)
	if err != nil {
		return ConnectionProfilesResponse{
			Profiles: []ConnectionProfile{},
			Message:  "No profiles found",
		}
	}
	json.Unmarshal(data, &profiles)

	var updated []ConnectionProfile
	for _, p := range profiles {
		if p.ID != id {
			updated = append(updated, p)
		}
	}
	if updated == nil {
		updated = []ConnectionProfile{}
	}

	if err := a.saveProfiles(updated); err != nil {
		return ConnectionProfilesResponse{
			Profiles: profiles,
			Message:  fmt.Sprintf("Error deleting profile: %v", err),
		}
	}

	for i := range updated {
		if updated[i].Password != "" {
			decrypted, err := decryptPasswordDPAPI(updated[i].Password)
			if err == nil {
				updated[i].Password = decrypted
			}
		}
	}

	return ConnectionProfilesResponse{
		Profiles: updated,
		Message:  "Profile deleted",
	}
}

// ConnectWithProfile connects using a saved connection profile
func (a *App) ConnectWithProfile(profile ConnectionProfile) ConnectionResponse {
	connStr := profile.ConnectionString
	if connStr == "" {
		if profile.AuthType == "windows" {
			connStr = fmt.Sprintf("server=%s;integrated security=true;trustservercertificate=true;", profile.Server)
		} else {
			connStr = fmt.Sprintf("server=%s;user id=%s;password=%s;trustservercertificate=true;", profile.Server, profile.Username, profile.Password)
		}
	}
	if profile.DefaultDatabase != "" {
		connStr += fmt.Sprintf("database=%s;", profile.DefaultDatabase)
	}
	return a.connectWithString(connStr, profile.Server, profile.DefaultDatabase)
}

func (a *App) connectWithString(connStr string, serverName string, dbName string) ConnectionResponse {
	a.DisconnectSQLServer()

	a.rawConnStr = connStr
	a.dbMap = make(map[string]*sql.DB)

	db, err := sql.Open("mssql", connStr)
	if err != nil {
		a.isConnected = false
		return ConnectionResponse{Success: false, Message: fmt.Sprintf("Failed to create connection: %v", err)}
	}

	err = db.PingContext(a.ctx)
	if err != nil {
		db.Close()
		a.isConnected = false
		return ConnectionResponse{Success: false, Message: fmt.Sprintf("Failed to ping server: %v", err)}
	}

	a.db = db
	a.dbMap[""] = db
	if dbName != "" {
		a.dbMap[dbName] = db
	}
	a.isConnected = true
	a.serverName = serverName
	a.databaseName = dbName
	a.executionTime = ""
	a.rowsAffected = 0

	return ConnectionResponse{
		Success:      true,
		Message:      "Connected successfully",
		ServerName:   serverName,
		DatabaseName: dbName,
	}
}

func (a *App) saveProfiles(profiles []ConnectionProfile) error {
	data, err := json.MarshalIndent(profiles, "", "  ")
	if err != nil {
		return fmt.Errorf("error marshaling profiles: %v", err)
	}
	return os.WriteFile(a.profilesFilePath, data, 0644)
}

func splitTableName(tableName string) []string {
	parts := []string{"dbo", tableName}
	dotIndex := -1
	for i := len(tableName) - 1; i >= 0; i-- {
		if tableName[i] == '.' {
			dotIndex = i
			break
		}
	}

	if dotIndex != -1 {
		parts[0] = tableName[:dotIndex]
		parts[1] = tableName[dotIndex+1:]
	}
	return parts
}
