/** A node from the skill_nodes tree table */
export type SkillNode = {
  id: string;
  name: string;
  /** Ancestry breadcrumb from root, e.g. ["Technology", "Programming", "JavaScript"] */
  path: string[];
  isLeaf: boolean;
  depth: number;
};

/** A skill selected on a profile with a proficiency level */
export type SelectedProfileSkill = {
  skillId: string;
  name: string;
  path: string[];
  /** 0-10 proficiency level */
  level: number;
};

/** A skill required by a posting with an optional minimum level */
export type SelectedPostingSkill = {
  skillId: string;
  name: string;
  path: string[];
  /** 0-10 minimum level, null = any level welcome */
  levelMin: number | null;
};

/** A browsable node (returned by the children API) */
export type BrowseNode = {
  id: string;
  name: string;
  isLeaf: boolean;
  childCount: number;
};
