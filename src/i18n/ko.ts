// Korean UI dictionary
import type { UIStrings } from './en';

export const ko: UIStrings = {
  // Header, footer, and other chrome
  'nav.home': '홈',
  'nav.about': '소개',
  'nav.works': '프로젝트',
  'nav.blog': '글',
  'nav.search': '검색',
  'nav.label': '주요 탐색',
  'nav.brandHome': '{site} 홈',
  'theme.toggle': '색상 테마 전환',
  'footer.notes': '글',
  'social.label': '소셜 링크',

  // Pagination
  'pagination.label': '페이지 탐색',
  'pagination.newer': '← 이전',
  'pagination.older': '다음 →',
  'pagination.status': '페이지 {current} / {total}',

  // Home
  'home.primaryLinks': '주요 링크',
  'home.viewWorks': '프로젝트 보기',
  'home.readNotes': '기술 글 읽기',
  'home.overviewLabel': '소개 요약',
  'home.latestWorksEyebrow': '주요 프로젝트',
  'home.allWorks': '전체 프로젝트',
  'home.workTech': '{title} 기술 스택',
  'home.worksEmpty':
    '<code>src/content/work</code>에 프로젝트를 추가하면 여기에 최신 작업이 표시됩니다.',
  'home.latestBlogEyebrow': '주요 기술 글',
  'home.allPosts': '전체 글',
  'home.postsEmpty':
    '<code>src/content/writing</code>에 글을 추가하면 여기에 최신 글이 표시됩니다.',

  // Blog index
  'blog.title': '기술 글',
  'blog.titlePaged': '기술 글 · {page}페이지',
  'blog.eyebrow': '기술 글',
  'blog.listLabel': '기술 글 목록',
  'blog.tagsEyebrow': '주제별 태그',
  'blog.tagsNavLabel': '글 태그',

  // Tag archive
  'tag.title': '“{tag}” 태그의 글',
  'tag.titlePaged': '“{tag}” 태그의 글 · {page}페이지',
  'tag.description': '{site}의 {tag} 태그 기술 글 목록입니다.',
  'tag.eyebrow': '태그',
  'tag.lead': '{tag} 태그로 분류된 기술 글 목록입니다.',
  'tag.listLabel': '{tag} 글 목록',
  'tag.moreTagsEyebrow': '다른 태그',
  'tag.otherTagsNavLabel': '기타 글 태그',
  'tag.allPosts': '전체 글',

  // Blog post
  'post.eyebrow': '기술 글',
  'post.readingTime': '{minutes}분 분량',
  'post.tocLabel': '목차',
  'post.contentsEyebrow': '목차',
  'post.adjacentLabel': '이전 / 다음 글',
  'post.previous': '이전 글',
  'post.next': '다음 글',
  'post.relatedEyebrow': '관련 글',
  'post.breadcrumbHome': '홈',
  'post.breadcrumbBlog': '글',

  // Works
  'works.title': '프로젝트',
  'works.eyebrow': '프로젝트',
  'works.listLabel': '주요 프로젝트',
  'work.eyebrow': '프로젝트',
  'work.visit': '프로젝트 보기',
  'work.repository': '저장소 보기',
  'work.stackEyebrow': '기술 스택',

  // About
  'about.title': '소개',
  'about.eyebrow': '소개',
  'about.ledgerLabel': '핵심 역량 및 경험',

  // Search
  'search.title': '검색',
  'search.eyebrow': '검색',
  'search.sectionLabel': '사이트 검색',
  'search.fallback':
    '검색 인덱스는 빌드 시 생성됩니다. <code>npm run build</code> 실행 후 사이트 미리보기에서 확인하세요.',

  // 404
  'notFound.title': '페이지를 찾을 수 없습니다',
  'notFound.description': '요청하신 페이지가 존재하지 않거나 이동되었습니다.',
  'notFound.eyebrow': '404 — Not Found',
  'notFound.heading': '페이지를 찾을 수 없습니다.',
  'notFound.lead':
    '주소가 잘못 입력되었거나 변경 또는 삭제되어 페이지를 표시할 수 없습니다. 아래 링크를 통해 다시 탐색해 보세요.',
  'notFound.linksLabel': '복구 링크',
  'notFound.home': '홈으로 이동',
  'notFound.blog': '기술 글 읽기',
  'notFound.works': '프로젝트 보기',
};
