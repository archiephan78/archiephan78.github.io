export const SITE = {
  website: "https://arch1ephan.com/", // replace this with your deployed domain
  author: "Chung Phan",
  profile: "https://arch1ephan.com/",
  desc: "enggineer/life/nothing",
  title: "arch1ephan.com",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  postPerTagsPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Suggest Changes",
    url: "https://github.com/archiephan78/archiephan78.github.io/edit/master/",
  },
  dynamicOgImage: true,
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "UTC", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
