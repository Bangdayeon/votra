export type DocSection = {
  heading: string;
  body: string;
};

export type ParsedDoc = {
  filePath: string;
  content: string;
  lastModified: Date;
  sections: DocSection[];
};
