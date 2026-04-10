export interface ExpectedColumn {
  name: string;
  dataType: string;
  addSql: string;
}

export interface RuntimeTableDefinition {
  name: string;
  createSql: string;
  columns: ExpectedColumn[];
}
