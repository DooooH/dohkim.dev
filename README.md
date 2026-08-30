# Backend Engineering Portfolio

Astro 기반의 기술 블로그 및 포트폴리오입니다. [Astro Keel](https://github.com/kpab/astro-keel)의 구조와 editorial design을 바탕으로, 장문의 백엔드 엔지니어링 글을 읽기 좋게 구성했습니다.

Astro Keel과 이 프로젝트의 코드는 [MIT License](./LICENSE)를 따릅니다.

## 로컬 실행

요구 사항:

- Node.js 22.19 이상 (`.nvmrc`는 Node 22)
- npm

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:4321`에서 실행됩니다.

```bash
npm run check   # Astro/TypeScript 검사
npm run build   # dist에 정적 사이트 생성 + Pagefind 인덱스 생성
npm run preview # 빌드 결과 로컬 확인
```

## 핵심 구조

```text
.
├── astro.config.mjs
├── public/
├── src/
│   ├── components/       # Callout, Mermaid, 코드 복사 등
│   ├── content/
│   │   ├── writing/     # Writing MDX/Markdown와 글 이미지
│   │   └── work/        # Work MDX/Markdown와 프로젝트 이미지
│   ├── layouts/          # 공통 문서, navigation, footer, SEO
│   ├── pages/
│   │   ├── writing/     # 목록, 글, 태그 경로
│   │   ├── work/        # 목록과 상세 경로
│   │   ├── about/
│   │   ├── rss.xml.ts
│   │   └── index.astro  # Home
│   ├── styles/
│   ├── consts.ts         # 사이트 이름, 설명, navigation, 소셜 링크
│   └── content.config.ts # Writing/Work frontmatter schema
└── package.json
```

## Writing 글 추가

`src/content/writing/` 아래에 MDX 파일 하나를 추가하면 됩니다. 파일명이 URL slug가 됩니다. 예를 들어 `queue-backpressure.mdx`는 `/writing/queue-backpressure/`로 생성됩니다.

````mdx
---
title: 'Designing Backpressure'
publishDate: 2026-08-30
tags:
  - backend
  - reliability
description: 'How a service keeps overload explicit and recoverable.'
draft: false
---

import Callout from '../../components/Callout.astro';
import Mermaid from '../../components/Mermaid.astro';

export const flow = `flowchart LR
  API[API] --> QUEUE[(Queue)]
  QUEUE --> WORKER[Worker]`;

## Make overload visible

<Callout type="warning" title="Bound every queue">
  An unbounded queue moves failure into memory and latency.
</Callout>

<Mermaid chart={flow} label="Request processing flow">
  <span slot="caption">Requests pass through a bounded queue.</span>
</Mermaid>

```ts
const queue = createQueue({
  // [!code highlight]
  capacity: 1_000,
  timeoutMs: 500, // [!code --]
  timeoutMs: 250, // [!code ++]
});
```
````

`Callout`의 `type`은 `note`, `tip`, `warning`, `danger`를 지원합니다. Mermaid는 문자열을 정의한 뒤 `Mermaid` 컴포넌트의 `chart`에 전달합니다. 코드 블록은 Shiki 문법 강조와 복사 버튼을 기본 제공하며 다음 주석 표기를 지원합니다.

- `// [!code highlight]`: 해당 줄 강조
- `// [!code ++]`: 추가된 줄
- `// [!code --]`: 제거된 줄

`heroImage: ./image.jpg`를 frontmatter에 선택적으로 추가할 수 있습니다. `draft: true`인 글은 공개 목록과 빌드된 Writing 경로에서 제외됩니다.

## Work 추가

`src/content/work/`에 Markdown 또는 MDX 파일을 추가합니다. 파일명이 `/work/<slug>/` 경로가 됩니다.

```md
---
title: 'Order Event Pipeline'
description: 'A retry-safe event pipeline with observable recovery.'
tech:
  - TypeScript
  - Kafka
  - PostgreSQL
publishDate: 2026-08-30
order: 1
thumbnail: ./order-pipeline.jpg
repo: 'https://github.com/example/project'
link: 'https://example.com'
---

## Constraint

Describe the production constraint.

## Approach

Explain the decision, trade-offs, and outcome.
```

`thumbnail`, `repo`, `link`, `order`는 선택 항목입니다. `repo`와 `link`에는 완전한 URL을 사용합니다.

## 사이트 설정

사이트 이름, 기본 설명, 작성자, navigation, footer, 소셜 링크는 `src/consts.ts`에서 수정합니다.

canonical URL, Open Graph, RSS, sitemap에 사용할 공개 주소는 `SITE_URL` 환경 변수로 설정합니다.

```bash
SITE_URL=https://your-domain.com npm run build
```

## Vercel 배포

1. 이 디렉터리를 GitHub 저장소에 push합니다.
2. Vercel에서 **Add New Project**를 선택하고 해당 GitHub 저장소를 Import합니다.
3. 저장소에서 이 프로젝트가 하위 디렉터리라면 Root Directory를 `astro-keel-blog`로 지정합니다.
4. Build Command를 `npm run build`, Output Directory를 `dist`로 설정합니다.
5. Node.js Version을 `22.x`로 설정합니다.
6. Environment Variables에 `SITE_URL`을 실제 공개 URL로 추가합니다. 예: `https://your-domain.com`.
7. Deploy 후 생성된 도메인을 사용한다면 `SITE_URL` 값을 그 주소로 확정하고 다시 배포합니다.

Astro의 정적 출력이므로 별도 Vercel adapter는 필요하지 않습니다.
