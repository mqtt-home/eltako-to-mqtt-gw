package eltako

type Data struct {
	Type       string      `json:"type"`
	Identifier string      `json:"identifier"`
	Value      interface{} `json:"value"`
}

type Device struct {
	DeviceGuid  string `json:"deviceGuid"`
	ProductGuid string `json:"productGuid"`
	DisplayName string `json:"displayName"`
	Infos       []Data `json:"infos"`
	Settings    []Data `json:"settings"`
	Functions   []Data `json:"functions"`
}
