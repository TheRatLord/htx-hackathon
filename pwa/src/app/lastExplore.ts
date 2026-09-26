// The BottomNav's Explore tab returns to the last Explore URL of the session (G.3).

let last = "/explore";

export const rememberExploreUrl = (url: string) => {
  last = url;
};

export const lastExploreUrl = () => last;
