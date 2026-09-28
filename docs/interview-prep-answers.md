# Chuẩn bị phỏng vấn — Middle/Senior Front-End Engineer

---

## PHẦN 1: Về kinh nghiệm & dự án cụ thể (Oneloyalty, Swift)

### 1. Kể chi tiết quá trình migrate từ Feature-Driven Architecture sang Layered Architecture — vì sao cần đổi, khó khăn lớn nhất là gì, đo lường kết quả (giảm bug, tăng tốc độ dev...) như thế nào?

Ban đầu source chia thành 2 repo riêng: 1 repo app admin Shopify, 1 repo extension. App admin phải dùng lại UI của extension nên bị duplicate code. Đầu tiên bọn em xử lý tạm bằng cách publish UI thành package qua GitLab Package Registry, dev thì dùng npm link cho tiện. Nhưng về sau bọn em quyết định gộp hẳn 2 repo thành Turborepo monorepo để dứt điểm — sửa UI ở đâu là các app dùng chung thấy ngay, không cần publish thủ công nữa.

Trong lúc migrate, em và anh senior phát hiện thêm một vấn đề khác: code đang tổ chức theo Feature-Driven nhưng các feature lại import chéo lẫn nhau rất nhiều — Feature A dùng của B, B dùng của A và C — nên hễ tách feature nào ra là lỗi dây chuyền. Vì vậy bọn em quyết định đồng thời tái cấu trúc sang Layered Architecture, tách rõ theo service/hooks/store/UI.

Về cách làm, bọn em đóng băng tính năng mới một thời gian để migrate dứt điểm, chia việc theo feature ai từng làm feature nào thì migrate feature đó, ưu tiên migrate feature nào nhiều feature khác phụ thuộc vào nhất trước — như Rewards Inventory — rồi mới đến các feature core như earn point, redeem, sau cùng là các feature nhỏ. Em trực tiếp phụ trách migrate Rewards, Setting App, Setting Page Loyalty, Campaign, Gamification, và cả phần UI dùng chung + i18n.

Khó nhất là giai đoạn chuyển UI component dùng chung — vì số lượng khá lớn nên phải chuyển dần, và có những lúc production phát sinh hotfix ngay đúng UI đang migrate dở, nên phải fix song song ở cả 2 source.

Kết quả là xoá hết duplicate ở hơn 40 component UI, dev feature mới nhanh hơn hẳn vì chỉ sửa 1 chỗ, hết tình trạng sửa feature này gãy feature khác, và build CI/CD cho cả monorepo ổn định trong khoảng 5–10 phút.

### 2. Bạn "decouple circular dependencies" cụ thể ra sao? Cho ví dụ một trường hợp thực tế.

Một ví dụ cụ thể là type TDataRewards — định nghĩa các kiểu dữ liệu reward — được đặt bên trong feature Rewards, nhưng lại được rất nhiều feature khác import trực tiếp để dùng như Campaign, VipTier. Vấn đề là TDataRewards về bản chất là entity dùng chung cho toàn hệ thống, không phải khái niệm riêng của Rewards, nên việc định nghĩa nó bên trong 1 feature cụ thể khiến các feature khác bị phụ thuộc trực tiếp vào nội bộ của 1 feature không liên quan đến domain của họ — đây chính là kiểu coupling gây ra vòng xoáy phụ thuộc khi hệ thống lớn dần, vì đến 1 lúc nào đó Rewards cũng sẽ cần dùng lại thứ gì đó từ các feature đang phụ thuộc vào nó, tạo thành vòng lặp thật sự.

Cách xử lý là chuyển TDataRewards ra layer dùng chung (shared/types hoặc entities/reward theo Layered Architecture), để nó trở thành nguồn định nghĩa trung lập — Rewards, Campaign, VipTier đều import từ layer chung đó thay vì phụ thuộc lẫn nhau.

a. Nếu bị hỏi thẳng: "Vậy đây có phải circular dependency thật không, hay chỉ 1 chiều?"

-> Case này em nhớ rõ nhất là chiều Campaign/VipTier phụ thuộc vào Rewards. Có thể lúc đó Rewards cũng có phụ thuộc ngược lại một phần nào đó, nhưng em không nhớ chính xác chi tiết cụ thể là gì để có thể mô tả đúng. Điều em chắc chắn là dù có vòng lặp thật hay chỉ là coupling 1 chiều sai chỗ, hướng xử lý đều giống nhau — đưa phần dùng chung ra layer trung lập để cắt đứt phụ thuộc trực tiếp giữa các feature.

### 3. Vì sao chọn Turborepo thay vì Nx hay Lerna? So sánh ưu/nhược điểm.

Quyết định chọn Turborepo là do anh senior đưa ra dựa trên đánh giá của ảnh, em không phải người trực tiếp so sánh và chốt giữa các lựa chọn. Nhưng qua trao đổi với ảnh lúc đó và quá trình dùng thực tế, em hiểu lý do chọn Turborepo là vì:

- Turborepo: nhẹ, cấu hình đơn giản (chỉ 1 file turbo.json), tối ưu mạnh về remote caching (cache lại kết quả build/lint/test không đổi) và chạy task song song → phù hợp với hệ thống chỉ toàn app/package React (không đa framework), học nhanh cho cả team.

- Nx: mạnh hơn về plugin ecosystem, generator, dependency graph visualization — phù hợp monorepo rất lớn, nhiều loại framework khác nhau (Angular + React + Node...), nhưng cấu hình phức tạp hơn, "nặng" hơn để học và maintain.

- Lerna: chủ yếu giải quyết bài toán publish/versioning nhiều package, không mạnh về task orchestration/caching như Turborepo (thực tế hiện nay Lerna thường dùng kèm Nx, hoặc bị thay bằng changesets).

→ Với team chỉ có app admin + extension (đều React), Turborepo là lựa chọn "vừa đủ": đơn giản, cache hiệu quả, không cần learning curve cao như Nx.

a. Nếu người phỏng vấn hỏi sâu hơn "vậy sao bạn không tự nghiên cứu/đề xuất?"

Ở dự án đó vai trò của em là thực thi migrate theo kiến trúc đã được quyết định, còn việc research & so sánh công cụ là do senior đảm nhận. Tuy nhiên em cũng đã tìm hiểu thêm sau đó để hiểu rõ hơn tại sao lựa chọn này hợp lý, và nếu vai trò của em rộng hơn (như Senior), em nghĩ em cũng sẽ đưa ra lựa chọn tương tự.

### 4. Quá trình publish shared UI library qua GitLab Package Registry rồi chuyển sang Turborepo workspace — vấn đề gặp phải khi maintain 2 cách này song song?

Trước khi chuyển hẳn sang Turborepo, workflow publish UI qua GitLab Package Registry có 2 điểm bất tiện chính: thứ nhất, ai muốn publish hay install package đều cần có token, phải setup/quản lý token này cho từng người trong team. Thứ hai, mỗi lần dev sửa component dùng chung, muốn xem thay đổi phản ánh sang app admin ngay thì phải build package, npm link để trỏ local test thử, xác nhận ổn mới publish version chính thức — vòng lặp dev-test-publish khá chậm so với hot-reload trực tiếp.

Về giai đoạn 2 hệ thống chạy song song — trong lúc migrate, team ưu tiên tái cấu trúc từ Feature-Driven sang Layered Architecture trước, nên package qua GitLab Package Registry vẫn tồn tại song song với packages/ui trong Turborepo đang hình thành dần. Vấn đề lớn nhất của giai đoạn này là phải luôn nhớ rõ 1 component cụ thể đã migrate vào Turborepo hay còn ở bản cũ — nếu sửa nhầm chỗ (ví dụ sửa ở package cũ trong khi app đã chuyển sang dùng bản mới trong workspace) thì thay đổi coi như vô nghĩa, hoặc tệ hơn là 2 bản dần lệch nhau (drift) mà không ai để ý.

Vấn đề cụ thể hay gặp nhất là khi production phát sinh hotfix đúng vào UI component đang trong quá trình migrate dở — phải fix ở cả 2 nơi: bản cũ đang chạy production (GitLab package) và bản mới đang migrate trong Turborepo, để tránh khi migrate xong lại bị mất fix đó. Việc này khá tốn thời gian và dễ sót nếu không ghi chú cẩn thận component nào đã fix ở đâu.

a. Nếu bị hỏi thêm: "Vậy làm sao đảm bảo không bị sót/nhầm trong lúc chạy song song 2 hệ thống?"

Thực tế team không có tool riêng để track, cách xử lý là: ngay sau khi hotfix xong ở 1 bên, việc ưu tiên tiếp theo là đồng bộ luôn sang bên còn lại trong cùng ngày để tránh bị quên. Nếu đúng lúc đó có việc gấp hơn cần xử lý ngay, mình sẽ note lại rõ ràng — component nào, sửa gì, cần đồng bộ sang đâu — rồi tranh thủ lúc rảnh trong ngày (sáng sớm hoặc buổi chiều) để cập nhật, đảm bảo không để qua ngày hôm sau mới nhớ ra.

### 5. Hệ thống i18n đa ngôn ngữ (8 ngôn ngữ) được tổ chức trong monorepo như thế nào? Xử lý vấn đề dịch thiếu/dịch trễ (lazy load) ra sao?

Hệ thống i18n được tổ chức thành 1 package dùng chung packages/i18n, chứa cấu hình lõi — danh sách 8 ngôn ngữ, fallback về tiếng Anh, và 1 hàm initI18n dạng singleton chỉ init 1 lần. Điểm hay là package này không tự cấu hình cứng nơi lấy bản dịch, mà nhận loader từ bên ngoài truyền vào theo kiểu dependency injection — nên mỗi app (admin, storefront) tự cung cấp loader riêng phù hợp với nhu cầu của mình.

Bản dịch không nằm tĩnh trong repo dạng file JSON, mà fetch runtime từ backend qua i18next-resources-to-backend. Vì tải bản dịch là bất đồng bộ, tụi mình dùng Suspense kết hợp cấu hình useSuspense: true của react-i18next để UI chờ tải xong bản dịch mới render, tránh nhấp nháy hiện key thô rồi mới ra chữ đúng.

Về xử lý dịch thiếu, hệ thống dựa vào cơ chế mặc định của i18next: thiếu ở locale hiện tại thì tự fallback về tiếng Anh, còn thiếu ở cả 2 thì trả về chính key thô thay vì crash app. Điểm mình nhận ra khi rà lại là hiện tại chưa có cơ chế log/telemetry khi thiếu key — nghĩa là nếu thiếu bản dịch, team chỉ phát hiện được khi ai đó tự nhìn thấy key thô hiển thị trên UI. Đây là điểm mình nghĩ nên bổ sung, có thể thêm bản JSON tiếng Anh tĩnh vào repo, Nếu request tới backend fail thì load bản tĩnh

a. "Vì sao không lưu bản dịch dạng file tĩnh trong repo mà phải gọi API runtime?"

Lý do chính là để phục vụ các vai trò non-dev như customer service, translator, hay PM có thể tự cập nhật nội dung dịch mà không cần dev can thiệp hay deploy lại app. Ví dụ thực tế: khi khách hàng (merchant) phản hồi muốn đổi câu chữ trong 1 thông báo hoặc nhãn nào đó, customer service có thể chỉnh sửa trực tiếp trên hệ thống quản lý nội dung ở backend và merchant thấy thay đổi gần như ngay lập tức, thay vì phải tạo ticket cho dev sửa file JSON, code review, rồi chờ đến deploy tiếp theo — có thể mất vài ngày. Nếu để bản dịch dạng file tĩnh trong repo, mọi thay đổi dù nhỏ nhất cũng phải đi qua toàn bộ quy trình phát triển phần mềm, không phù hợp với tốc độ phản hồi khách hàng mà team customer service cần.

### 6. Kể về lần bạn debug CI/CD pipeline (GitLab CI + Docker) bị fail — quy trình debug của bạn thế nào?

Một lần cụ thể: code chạy pass bình thường ở máy mình, nhưng lên GitLab CI thì fail ngay ở bước npm install. Log lỗi hiện rất rõ ràng:

npm error notsup Required: {"node":">=22.0.0"}
npm error notsup Actual: {"npm":"10.6.2","node":"v18.12.0"}

Đọc log là biết ngay nguyên nhân: một package nào đó trong dependency yêu cầu Node từ bản 22 trở lên, trong khi Docker image dùng trong pipeline CI đang chạy Node 18.12.0 — trong khi máy mình local đã dùng Node 22 nên không gặp vấn đề.

Mình xác nhận lại bằng cách kiểm tra version Node ở máy local (node -v) để so sánh trực tiếp với version báo lỗi trên CI, khớp đúng với nghi ngờ. Vì phần Docker image dùng trong .gitlab-ci.yml không thuộc quyền mình chỉnh sửa, mình báo cho DevOps kèm log lỗi cụ thể và yêu cầu bump version Node trong Docker image lên tương thích với yêu cầu của package (>=22), khớp với version mình đang dùng ở local. Sau khi DevOps cập nhật, pipeline chạy pass bình thường."

---

Một case khác: pipeline build Docker image cũng bị fail với triệu chứng ban đầu trông giống lỗi version Node — nhưng lần này mình không vội kết luận giống case trước (chỉ đơn giản bump Node version), mà đọc kỹ log hơn thì thấy có dòng console.log('install packages shopify apps extension...') xuất hiện ngay trong quá trình npm install — đây là điều bất thường, vì log này không phải log tiêu chuẩn của npm install.

Lần theo dòng log đó, mình tìm ra nó xuất phát từ scripts/afterInstall.js, được gọi qua hook prepare trong package.json — npm tự động chạy hook này ngay sau mỗi lần npm install, nên nó chạy ẩn, không hiện rõ trong Dockerfile.

Đọc code trong afterInstall.js, hàm installPackagesShopifyApps() có logic: nếu không phát hiện biến môi trường CI, NODE_ENV, hoặc VITE_APP_ENV, nó sẽ tự cd vào project con shopify-apps và chạy npm install riêng cho project đó — và chính npm install phụ này mới là nơi phát sinh lỗi liên quan version Node. Điều quan trọng là shopify-apps là project độc lập dùng để build extension, cần deploy thủ công riêng, không liên quan gì đến pipeline build web app đang chạy — nên việc nó bị cài vào đây hoàn toàn không cần thiết và gây lãng phí/rủi ro không đáng có.

Đối chiếu lại Dockerfile lúc đó, không có dòng nào set các biến môi trường nên em đã set biến môi trường vào Dockerfile và pipeline đã skip npm install project shopify-apps

### 8. Shopify Admin/Storefront GraphQL API cụ thể: Bạn xử lý rate limit (cost-based throttling) của Shopify GraphQL API như thế nào? Có dùng codegen (graphql-codegen) để sinh type từ schema không?

Thẳng thắn là em chưa gặp trực tiếp vấn đề rate limit/cost-based throttling trong dự án thực tế — có thể vì volume và tần suất gọi GraphQL API trong dự không đủ lớn để chạm ngưỡng, chủ yếu là query phục vụ thao tác đơn lẻ của merchant chứ không có tác vụ bulk fetch liên tục.

Em cũng chưa dùng graphql-codegen trong dự án thật, toàn tự định nghĩa type cho response GraphQL bằng tay chứ không sinh từ schema. Tuy nhiên em có tìm hiểu và áp dụng vào 1 dự án cá nhân để học — thấy khá tiện vì type được sinh tự động khớp đúng với schema, không cần viết tay, và nếu sau này schema đổi (field bị deprecate, đổi kiểu dữ liệu...) thì compiler báo lỗi ngay thay vì phải tự phát hiện. Nếu có cơ hội đụng vào dự án thật, đặc biệt là dự án có nhiều query/mutation và schema thay đổi thường xuyên, em sẽ ưu tiên dùng codegen nhiều hơn.

### 9. Auth flow — Shopify native ID token hooks (Swift): Giải thích cụ thể flow cũ (session token / OAuth cũ) so với ID token hook mới, vì sao nó giúp giảm load time?

Auth flow cũ thì cũng khá lâu rồi nên em không nhớ chi tiết 100%, nhưng đại khái flow là: vào app trước tiên phải gọi API lấy token từ server (token này lưu được khoảng 1 tuần), API này mất vài giây mới trả response. Có token rồi mới gọi tiếp API lấy thông tin shop, plan của shop để render UI, cũng mất thêm vài giây nữa. Tổng cộng lúc đó UI đầu tiên load mất khoảng 12-13 giây.

Về nguyên nhân chính xác vì sao API đó chậm thì em không dám khẳng định, đây chỉ là suy đoán của em lúc đó thôi: hồi đó Shopify vẫn còn cho phép app chạy dạng standalone (app rời, chưa bắt buộc embedded), và em nghĩ có thể flow xác thực cũ đó vẫn còn giữ cơ chế của thời app rời — vốn không tối ưu bằng cơ chế embedded sau này — nên mới phát sinh độ trễ như vậy. Em không có đủ thông tin để xác nhận chắc chắn.

Lúc em mới nhận dự án, chưa đủ dữ liệu để khẳng định vấn đề nằm ở đâu, nên em tập trung tối ưu phần FE trong tầm kiểm soát trước — code splitting + lazy load theo route, giảm được xuống còn khoảng 8-9 giây. Song song đó em cũng ghi nhận nghi ngờ của mình để trao đổi thêm khi có dịp.

Sau đó anh senior FE mới vào, chuyển hẳn sang App Bridge 2.0 với cơ chế session token — về bản chất đây là 1 JWT ngắn hạn được Shopify ký sẵn (HS256 bằng client secret). BE chỉ cần verify chữ ký và check các claim như exp, aud là đủ, không cần tra DB hay gọi ra service nào khác để xác thực — nên tốc độ xử lý giảm hẳn xuống chỉ còn vài mili giây cho tới 1 giây.

### 10. Internal NPM package (store speed-auditing, Swift): Bạn thiết kế API/interface cho package này thế nào để các app khác dùng lại được? Quy trình version, publish, breaking change được xử lý ra sao?

Em thiết kế theo hướng component nhận props thay vì để app khác đụng vào internal — component nhận store_id, shopify_domain, language và các callback như onClickFixSpeed để app cha tự quyết xử lý gì (dạng inversion of control, app host kiểm soát hành vi thay vì package tự ý làm). Những dependency chắc chắn app host cũng có như React hay UI library dùng chung thì để ở peerDependencies chứ không bundle theo, tránh xung đột version (2 instance React khác nhau trong 1 app) và tránh tăng bundle size không cần thiết.

Về xác thực, có 1 API nhận store_id, app_name, shopify_domain để verify ban đầu, còn các API còn lại chỉ nhận store_id — không có verify thêm, và verify lần đầu cũng không trả về token/session nào để các API sau dùng lại.

Về quy trình version, publish, breaking change:

Version tăng thủ công, repo chưa có CHANGELOG, chưa có git tag khớp với version npm. Khi có thay đổi/breaking change, không có cơ chế thông báo chính thức (như thay đổi ở packages/ui/i18n) — mọi thay đổi mới nhất được ghi vào file README, app nào muốn integrate hoặc update thì tự đọc README để biết.

Điểm đặc biệt là package này có 2 team cùng phát triển và dùng chung — app Swift và app Transy — em là người tạo package đầu tiên, sau đó có thêm thành viên từ cả 2 team tham gia phát triển tiếp.

a. Nếu bị hỏi thẳng: "Vậy các API sau không xác thực gì thì có phải lỗ hổng bảo mật không?"

Đúng, đây là điểm hạn chế thật của thiết kế lúc đó. Việc chỉ dựa vào store_id cho các API sau có nghĩa là ai biết được store_id đều có thể gọi được các API đó, không có cơ chế nào ngăn request giả mạo. Lúc đó bọn em chưa nghĩ kỹ đến rủi ro này, có thể vì phạm vi package chỉ là các tính năng đọc/audit tốc độ store, không phải action nhạy cảm (không sửa/xoá dữ liệu quan trọng), nên rủi ro thực tế được đánh giá thấp — nhưng về mặt thiết kế đúng ra nên có cơ chế như: verify lần đầu trả về 1 token ngắn hạn (JWT) để các API sau xác thực bằng token đó thay vì chỉ dựa vào store_id.

b. Nếu bị hỏi tiếp: "2 team cùng dev chung 1 package thì làm sao tránh xung đột/breaking change lẫn nhau?"

Thực tế quy trình khá thủ công — không có semver rõ ràng hay changeset để track ai thay đổi gì, breaking change gì. Cách xử lý dựa nhiều vào giao tiếp trực tiếp giữa 2 team hơn là quy trình tự động: ai sửa gì ảnh hưởng đến interface dùng chung thì cần báo trước, cập nhật README, và các app dùng phải tự kiểm tra khi bump version mới. Đây rõ ràng là điểm có thể cải thiện — nếu làm lại, em sẽ đề xuất dùng Changesets để mỗi thay đổi được khai báo rõ loại (patch/minor/major), tự sinh changelog, và bump version có kiểm soát thay vì để 2 team tự thống nhất bằng lời.

### 11. Docker containerized builds: Multi-stage build bạn từng cấu hình chưa? Cách giảm image size, cache layer để build nhanh hơn?

Em chưa từng trực tiếp cấu hình multi-stage build — phần Dockerfile/CI config ở dự án không thuộc quyền của em, em chủ yếu là người debug CI/CD mỗi khi có vấn đề và làm việc với DevOps để họ điều chỉnh, chứ không tự viết/tối ưu Dockerfile.

trong dự án oneloyalty thì em thấy đang cấu hình multi-stage với 2 stage. stage 1 là Build stage: dùng image node:20-alpine để install dependencies và build ra static files (npm run build → thư mục dist). stage 2 là Production stage: dùng image nginx:alpine, chỉ copy đúng thư mục dist từ build stage sang bằng COPY --from=build-stage, cùng file config nginx, rồi expose port 80.

Lợi ích chính: image cuối cùng chạy production không hề chứa Node.js, node_modules, source code hay dev dependencies — chỉ có static files + nginx. Giảm size đáng kể (từ vài trăm MB xuống chỉ còn ~20-30MB) và giảm luôn attack surface vì không có toolchain build nằm trong container chạy thật.

Cách giảm image size:

- Dùng alpine base image thay vì full image (node:20-alpine thay vì node:20).
- Multi-stage như trên — tách biệt build-time dependency và runtime.
- Dùng .dockerignore để loại node_modules, .git, dist cũ... ra khỏi build context, tránh copy thừa và tránh cache bị sai.
- Nếu cần, dùng npm ci --omit=dev hoặc chỉ cài prod dependencies ở stage nào cần.

Cách tối ưu cache layer để build nhanh hơn:

- Nguyên tắc: layer nào ít đổi thì đặt trước, layer nào đổi thường xuyên thì đặt sau.
- Copy package.json + package-lock.json trước, chạy npm ci ngay sau đó, rồi mới COPY . . để lấy source code. Như vậy nếu chỉ sửa code mà không đổi dependency, Docker sẽ tái sử dụng cache của layer npm ci — không phải install lại từ đầu mỗi lần build.
- Dùng npm ci thay vì npm install — nhanh và deterministic hơn vì nó đọc thẳng lock file, không resolve lại version.
- Có thể tận dụng BuildKit cache mount (--mount=type=cache,target=/root/.npm) để cache npm cache giữa các lần build kể cả khi layer bị invalidate.
- Tận dụng registry cache (--cache-from) trong CI để pull layer cache từ image build trước đó.

Thực ra khi review lại Dockerfile hiện tại của mình, mình nhận ra đang copy toàn bộ source (COPY . .) trước khi install — điều này vô tình làm mất tác dụng của việc tách riêng package*.json, vì bất kỳ thay đổi source nào cũng làm invalidate cache của bước install. Đây là lỗi khá phổ biến, và cách sửa là đảm bảo thứ tự: copy lock file → install → copy source.

### 12. Theme speed optimization & SEO suite (Swift): Cách đo lường hiệu quả sau khi tối ưu (trước/sau) — dùng tool gì để chứng minh với merchant? Cách xử lý lazy-load ảnh mà không ảnh hưởng LCP (vì ảnh đầu tiên thường không nên lazy)?

Lúc đó em làm ở vị trí fresher, vai trò của em trong các tính năng theme speed optimization và SEO suite chủ yếu là phát triển phần UI — màn hình cấu hình, bật/tắt từng tính năng tối ưu, hiển thị kết quả — dựa trên API mà BE cung cấp. Phần script/logic cốt lõi để thực sự minify JS/CSS, xử lý lazy-load ảnh, dọn HTML là do BE hoặc senior xử lý, em không trực tiếp viết phần đó.

Về đo lường hiệu quả trước/sau, công cụ em dùng để chứng minh với merchant là PageSpeed Insights (pagespeed.web.dev) — chạy đo điểm số và các chỉ số Core Web Vitals (LCP, CLS, FCP...) trước khi bật tính năng và sau khi bật, so sánh trực quan bằng số điểm/thời gian cụ thể để merchant thấy rõ hiệu quả.

Về cách xử lý lazy-load ảnh mà không ảnh hưởng LCP — phần này em thật sự không nắm được cách BE/senior xử lý cụ thể lúc đó, vì không phải phần em trực tiếp làm.

Về nguyên lý chung mà em biết , vấn đề lazy-load ảnh mà ảnh hưởng LCP thường do áp dụng lazy-loading đồng loạt cho mọi ảnh trên trang. mà ảnh nằm trong viewport ban đầu - ảnh đó thường chính là LCP element, nên lazy nó sẽ trì hoãn thời điểm ảnh được tải, làm tăng LCP. Cách xử lý đúng là chỉ lazy-load các ảnh nằm dưới màn hình đầu tiên (below-the-fold), còn ảnh đầu tiên/ảnh hero thì để tải ngay (loading="eager", thậm chí thêm fetchpriority="high") để trình duyệt ưu tiên tải sớm nhất có thể.

## PHẦN 2. Kỹ thuật sâu (Technical Deep-dive)

### 1. Strict TypeScript là gì, khác gì so với TypeScript thường? Bạn xử lý any, generic phức tạp, type narrowing như thế nào trong dự án thực tế?

TStrict Mode là tập cờ compiler TypeScript bật qua "strict": true, gồm strictNullChecks, noImplicitAny, strictPropertyInitialization... buộc mọi type phải tường minh, không cho ngầm định any hay bỏ qua null/undefined. So với TypeScript thường, non-strict vẫn cho qua nhiều lỗ hổng type ngầm, dễ sinh runtime error mà compile-time không bắt được — strict mode chặt hơn nhưng giảm bug đáng kể, nhất là trong monorepo nhiều người code.

Về cách xử lý thực tế, nguyên tắc mình rút ra từ dự án: ở ranh giới hệ thống — API response, đọc storage, lib chưa có type tốt, hay catch block — mình nhận unknown trước, rồi narrow bằng type guard (x is T) hoặc instanceof trước khi dùng, tránh tin tưởng mù quáng vào type ép sẵn. Trong lõi app thì tin vào type đã định nghĩa, dùng discriminated union cho các trường hợp nhiều biến thể (như các loại reward khác nhau), và dùng Pick/Omit/Partial để derive (lấy) type con từ type gốc, giúp type tự đồng bộ khi entity gốc đổi field mà không cần sửa tay nhiều chỗ. any chỉ dùng khi bị ép bởi thư viện thứ 3 thiếu type tốt, và luôn kèm comment giải thích lý do, ưu tiên @ts-expect-error hơn @ts-ignore vì nó tự báo lỗi ngược lại khi dòng code đó không còn lỗi nữa — giúp dọn dẹp comment thừa dễ hơn

a. "Vì sao repo không bật noUncheckedIndexedAccess? Bật thì có lợi gì, tại sao chưa bật?"

-> Lợi ích là an toàn hơn khi truy cập mảng/object theo index hoặc key động — tránh runtime error kiểu Cannot read property of undefined mà compile-time không bắt được trước đó. Nhưng đánh đổi là sẽ phải sửa lại rất nhiều chỗ trong codebase hiện tại đang giả định index luôn tồn tại — vì đây là 1 codebase lớn đã viết từ trước, bật cờ này vào giữa chừng sẽ phát sinh rất nhiều lỗi type cần sửa, nên có thể team chưa ưu tiên làm ngay. Nếu là dự án mới từ đầu thì nên bật ngay để tránh nợ kỹ thuật sau này.

b. "skipLibCheck rủi ro thế nào, sao vẫn bật?"

-> Rủi ro là nếu 1 package trong node_modules có file .d.ts định nghĩa sai (khá phổ biến với các package cộng đồng ít duy trì), TypeScript sẽ không phát hiện ra vì bị skip check. Lý do vẫn bật là vì check toàn bộ .d.ts của tất cả dependency trong node_modules — nhất là monorepo nhiều package — sẽ làm chậm đáng kể thời gian type-check/build, nên hầu hết dự án thực tế đều bật skipLibCheck để đánh đổi lấy tốc độ, chấp nhận rủi ro đó ở mức thấp vì thường các type lỗi ở .d.ts không quá phổ biến với các lib chính đang dùng.

### 2. So sánh TanStack React Query v4 vs v5 — điểm khác biệt lớn nhất, tại sao upgrade?

Việc upgrade version là quyết định của senior khi đánh giá thấy lợi ích lớn hơn chi phí migrate, em không phải người đề xuất/chốt việc này. Nhưng em hiểu lý do nâng cấp là:

- API thống nhất hơn: v5 gộp các hook (useQuery, useQueries, useInfiniteQuery) dùng chung 1 dạng object API, bỏ nhiều overload gây rối.
- Object-only API (useQuery({ queryKey, queryFn })) giúp TypeScript infer type tốt hơn — quan trọng vì dự án dùng Strict TypeScript.
- Đổi isLoading → isPending để phân biệt rõ "chưa có data lần đầu" và "đang fetch lại".
- Giảm bundle size, tương thích tốt hơn với React 18 Suspense/concurrent features.

### 3.React Query giải quyết vấn đề gì so với Redux/Zustand? Khi nào bạn chọn server state (React Query) vs client state (Zustand/Redux)?

- React Query dùng cho server state (dữ liệu từ API/GraphQL) — tự động lo caching, refetch, stale time, invalidation, tránh phải tự viết loading/error state thủ công.
- Zustand/Redux dùng cho client state thuần (UI state, filter, form step, theme...) không cần đồng bộ với server.

### 4.Giải thích cách bạn tối ưu bundle size / code splitting với Vite + SWC. Cách phân tích bundle chunk (dùng tool gì)?

Cần làm rõ trước: SWC không trực tiếp giảm bundle size — Oneloyalty dùng @vitejs/plugin-react-swc chủ yếu để build/dev nhanh hơn Babel, minify production vẫn do esbuild của Vite lo. Cái thực sự cắt size là cấu hình esbuild.drop để strip console/debugger ở production.

Về code splitting, dự án áp dụng route-level splitting bằng React.lazy cho từng feature, component-level splitting cho phần nặng như preview, và vendor chunk splitting qua manualChunks để tách react/react-dom ra chunk riêng, cache ổn định lâu dài. Phần chiến lược này do senior thiết lập từ đầu, em là người hiểu và áp dụng đúng pattern khi thêm feature mới.

Về công cụ phân tích bundle, ở Oneloyalty có setup vite-bundle-analyzer nhưng đang tắt, ít dùng thực tế trong công việc. Để tự học thêm, em có 1 dự án cá nhân dùng rollup-plugin-visualizer để xem treemap kích thước từng module kèm gzip/brotli size, và knip để tìm code/dependency không dùng tới trước khi build — giúp giảm bundle từ gốc thay vì chỉ tối ưu ở bước bundling.

a. Vì sao Oneloyalty tắt vite-bundle-analyzer?"

→ team ít debug, chỉ cần bật khi cần debug, để mặc định tắt tránh ảnh hưởng build thường ngày

b. "knip có ảnh hưởng gì tới runtime không hay chỉ là dev tool?"

→ Chỉ là dev-time tool, chạy như 1 lệnh riêng (thường trong CI hoặc chạy tay), không ảnh hưởng gì đến bundle/runtime production — nó chỉ giúp phát hiện để mình tự xóa code thừa.

### 5.Web Vitals bạn theo dõi những chỉ số nào (LCP, FID/INP, CLS...)? Cách cải thiện từng chỉ số trong Shopify embedded app?

Định nghĩa nhanh 3 chỉ số (để mở đầu câu trả lời)

- LCP (Largest Contentful Paint): thời gian để phần tử lớn nhất trong viewport (thường là ảnh, block text lớn, hoặc component chính) render xong. Đo "cảm giác trang đã tải xong nội dung chính" chưa. (≤2500ms)

-> LCP là thời gian để phần tử có diện tích hiển thị lớn nhất trong viewport hoàn tất render lên màn hình. Không phải mọi phần tử đều được tính — trình duyệt chỉ xét các loại có nội dung thực sự như ảnh, poster video, background-image, hoặc block chứa text — một div rỗng dùng để tạo khoảng trống thì dù to cỡ nào cũng không tính. Con số LCP đo bằng thời gian (giây), không phải kích thước — ý nghĩa của nó là đo 'cảm giác người dùng thấy nội dung chính của trang đã sẵn sàng' nhanh hay chậm.

- CLS (Cumulative Layout Shift): đo độ "giật" của layout khi các phần tử dịch chuyển vị trí ngoài ý muốn trong lúc trang đang tải. (≤0.1)

- INP (Interaction to Next Paint): thay thế FID từ 3/2024, đo thời gian từ lúc người dùng tương tác (click/tap/gõ phím) đến khi trình duyệt vẽ xong khung hình phản hồi tiếp theo — tính cho mọi tương tác trong suốt vòng đời trang (không chỉ tương tác đầu tiên như FID cũ). (≤200ms)

- FCP (First Contentful Paint): thời gian từ lúc bắt đầu load đến khi phần tử đầu tiên (bất kỳ — text, ảnh, canvas...) xuất hiện trên màn hình. Đo "cảm giác trang bắt đầu có gì đó hiển thị" chưa, sớm hơn LCP. (≤1800ms)

--- câu trả lời ----
Ở Oneloyalty, 3 chỉ số team quan tâm là LCP, FCP, và CLS.

Về CLS, nguyên nhân chính là các section/component thay đổi kích thước đột ngột khi data thật về — ví dụ ban đầu section rỗng hoặc chỉ có skeleton nhỏ, sau khi fetch xong nội dung dài ra làm đẩy các phần tử phía dưới dịch chuyển. Cách xử lý là đặt trước width/height cố định hoặc xấp xỉ đúng cho các section đó ngay từ lúc chưa có data, sao cho kích thước skeleton gần bằng kích thước khi data thật render ra — không gian đã được 'giữ chỗ' từ trước nên khi data về, layout không bị nhảy. Với phần khó đoán trước kích thước chính xác (nội dung text dài ngắn tuỳ dữ liệu), em ưu tiên dùng min-height thay vì height cố định tuyệt đối để tránh vỡ layout khi data thật lớn hơn dự đoán.

Về FCP, chủ yếu tối ưu bằng cách giảm JS/CSS chặn render ban đầu — code-splitting theo route và tách vendor chunk (đã áp dụng ở phần bundle size) giúp trình duyệt không phải tải một bundle lớn trước khi vẽ được gì lên màn hình.

Về LCP, cần xác định đúng phần tử nào đang là LCP element trên từng page bằng Lighthouse hoặc DevTools Performance, sau đó ưu tiên tải sớm phần tử đó — nếu là ảnh thì không lazy-load nó, còn nếu phụ thuộc data từ API thì tối ưu tốc độ API đó hoặc tận dụng cache của React Query (staleTime) để tránh phải chờ fetch lại mỗi lần vào trang

Về INP: dù team chưa track chính thức, em nghĩ đây là điểm nên bổ sung, vì app admin có rất nhiều tương tác liên tục — filter bảng dữ liệu, mở modal, chuyển bước trong wizard — INP phản ánh trải nghiệm thực tế của những tương tác này tốt hơn nhiều so với FID cũ (chỉ đo tương tác đầu tiên). Cách cải thiện: tránh long task chặn main thread bằng cách chia nhỏ tác vụ nặng, dùng useTransition/startTransition của React 18 để đánh dấu update không khẩn cấp (như filter danh sách lớn), debounce input để giảm tính toán thừa khi gõ nhanh, virtualize list dài, và memo hóa (useMemo/React.memo) để tránh re-render không cần thiết."

### 6.React 18 concurrent features (useTransition, Suspense...) bạn đã dùng trong dự án chưa? Ví dụ cụ thể?

Có, em dùng Suspense kết hợp React.lazy khá thường xuyên — code-split theo route và cả những component nặng như preview hay các bước trong wizard, fallback bằng skeleton. App mount bằng createRoot nên chạy concurrent renderer sẵn từ đầu.

Còn useSyncExternalStore thì em không trực tiếp gọi trong code — đây là API mà Zustand và React Query đã dùng sẵn ở tầng bên dưới để đảm bảo đọc external store an toàn dưới concurrent rendering, tránh tearing. Vì em chỉ tương tác với 2 thư viện đó qua các hook cấp cao (useStore, useQuery), nên phần an toàn với concurrent mode gần như 'miễn phí' — không phải tự lo.

useTransition và useDeferredValue thì em cũng chưa có dịp dùng trực tiếp, vì phần 'giữ data cũ mượt trong lúc chờ data mới' đã được React Query lo qua placeholderData rồi.

*** các khái niệm liên quan ***

a. Concurrent renderer (bộ render đồng thời)

Trước React 18: rendering là "blocking" : Khi state thay đổi, React dựng lại cây component và commit ra DOM trong một mạch không thể ngắt. Nếu cây lớn, việc này chiếm main thread 50–200ms → trong khoảng đó browser không xử lý được gõ phím, click, animation → UI "đơ".

setState ──► render toàn bộ (không dừng được) ──► commit DOM
[main thread bị khóa ở đây]

Từ React 18: rendering có thể "interruptible (ngắt quãng)"

Concurrent renderer cho phép React:

- Tạm dừng việc render giữa chừng, trả main thread lại cho browser xử lý việc gấp (gõ phím), rồi quay lại render tiếp.
- Bỏ luôn một lần render đang dở nếu có state mới hơn (kết quả cũ không còn cần).
- Chuẩn bị một phiên bản UI trong bộ nhớ (chưa hiện lên màn hình) rồi mới hiển thị khi sẵn sàng.
- Gán mức ưu tiên khác nhau cho các lần update: gõ phím = gấp, lọc danh sách = có thể chờ.

Quan trọng: bật createRoot không tự động làm app nhanh hơn. Nó chỉ cho phép các tính năng bên dưới (Suspense streaming, useSyncExternalStore, useTransition, useDeferredValue, startTransition,...) hoạt động. Nếu bạn không dùng gì thì hành vi gần như y hệt cũ.

b. useSyncExternalStore : Vấn đề: "tearing" (state không nhất quán khi hiên thị ở các component khác nhau)

"External store" = state nằm ngoài React: Zustand, Redux, một biến module, window.matchMedia, v.v.
Với concurrent renderer, một lần render có thể bị chia làm nhiều lát cắt theo thời gian.

Nếu store bên ngoài đổi giá trị giữa các lát cắt, thì:

- Component A (render lúc 10:00:00.000) đọc count = 5
- Store update → count = 6
- Component B (render lúc 10:00:00.050, cùng một lần render) đọc count = 6

→ Trên màn hình: A hiển thị 5, B hiển thị 6 cùng lúc, dù chúng đọc cùng một nguồn. Đó là tearing — trạng thái không nhất quán. State nội bộ của React (useState) không bị vì React quản lý được; store ngoài thì không.

Giải pháp
useSyncExternalStore là API React cung cấp để thư viện store đăng ký đúng cách. React dùng nó để phát hiện store đã đổi giữa chừng và render lại đồng bộ cho nhất quán.

```typescript
function useWindowWidth() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("resize", cb);
      return () => window.removeEventListener("resize", cb);
    },
    () => window.innerWidth,
    () => 1024 // SSR fallback
  );
}
```

c. useTransition / startTransition (Ý tưởng: đánh dấu update "không gấp")

Mặc định mọi setState đều là "urgent" — React render ngay và chặn cho tới xong. startTransition bọc quanh một update để nói: "cái này chậm cũng được, đừng chặn tương tác của người dùng vì nó".

```typescript
const [isPending, startTransition] = useTransition();
const [query, setQuery] = useState("");
const [results, setResults] = useState(allItems);

function onChange(e) {
  const value = e.target.value;
  setQuery(value); // URGENT: input phải cập nhật ngay

  startTransition(() => {
    setResults(filterHugeList(value)); // TRANSITION: lọc 10k item, có thể ngắt
  });
}
```

Điều gì xảy ra:

- setQuery chạy ngay → ô input hiển thị ký tự vừa gõ, không delay.
- setResults chạy ở priority thấp. Nếu user gõ tiếp ký tự nữa khi React đang lọc dở → React vứt lần lọc cũ, làm lại với giá trị mới. Không bao giờ có tình trạng bàn phím bị "nuốt phím".
- isPending === true trong lúc transition đang chạy → dùng để làm mờ danh sách cũ, hiện spinner nhẹ.

* useTransition vs startTransition (bản import rời)

d. useDeferredValue

Cùng mục tiêu với useTransition nhưng tiếp cận từ phía giá trị thay vì phía update. Dùng khi bạn nhận một giá trị (từ props, từ state của người khác) và không kiểm soát chỗ setState.

```typescript
function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  // query      = giá trị mới nhất (đi theo input, cập nhật ngay)
  // deferredQuery = giá trị "trễ", tụt lại khi render nặng

  const list = useMemo(
    () => filterHugeList(deferredQuery),
    [deferredQuery]
  );

  const isStale = query !== deferredQuery; // đang hiển thị kết quả cũ

  return <div style={{ opacity: isStale ? 0.5 : 1 }}>{list}</div>;
}
```

Cơ chế:

- Khi query đổi, useDeferredValue trước tiên trả về giá trị cũ → React render nhanh với data cũ, commit ngay (UI phản hồi).
- Sau đó React render lại "ở nền" với giá trị mới. Nếu bị update gấp hơn cắt ngang → bỏ, làm lại.
- Khi xong → hiển thị kết quả mới.

*** lưu ý ***

các hook trên chỉ có tác dụng khi phần render thực sự nặng. Với list vài chục item thì không thấy khác biệt — thậm chí thêm overhead. Đo bằng React Profiler trước khi thêm

Đừng thêm useDeferredValue/useTransition "cho chắc". Chỉ thêm khi React Profiler cho thấy một lần render/commit > ~50ms (mốc người dùng bắt đầu cảm nhận lag) và nguyên nhân là render đồng bộ chặn input. Còn lại thì render thẳng rẻ hơn.

### 7.Sự khác biệt giữa REST và GraphQL ?

REST

- Cấu trúc: Nhiều endpoint riêng (/products, /orders, /customers...)
- Lấy data: Dễ bị over-fetching (nhận dư field không cần) hoặc under-fetching (phải gọi nhiều request nối tiếp để lấy đủ data liên quan)
- Version API: Thường versioning qua URL (/api/2024-01/products.json)
- Hiệu năng: Nhiều request nhỏ hơn nhưng đơn giản hơn để cache (HTTP cache theo URL)
- Học/dùng: Dễ hiểu, quen thuộc

GraphQL

- 1 endpoint duy nhất, client tự định nghĩa cần field gì
- Lấy data: Client chỉ định chính xác field cần, lấy nhiều resource liên quan trong 1 request duy nhất (ví dụ: lấy product kèm luôn variants, images, collections trong 1 query)
- Version API: Có type system + schema rõ ràng, dễ biết field nào deprecated
- Hiệu năng: Ít request hơn nhưng mỗi query có thể phức tạp hơn, khó cache theo URL truyền thống
- Học/dùng: Cần học schema, viết query/mutation, dùng codegen để có type-safe

### 8.Giải thích React Router v7 Data Router — loader/action pattern khác gì với cách routing cũ?

Dự án dùng React Router v7 ở dạng Data Router chủ yếu để tận dụng phần routing structure — nested routes, layout route dùng chung (ví dụ layout admin có sidebar cố định, các route con render bên trong), và errorElement để xử lý lỗi tập trung theo từng route thay vì try/catch rải rác.

Còn phần data-fetching, dự án không dùng loader/action của React Router mà vẫn giữ TanStack React Query, vì React Query đã đảm nhiệm rất tốt các việc mà loader không có sẵn: caching giữa các lần chuyển route, tự động refetch khi window focus lại, retry khi lỗi, optimistic update, và quan trọng nhất là cache được chia sẻ xuyên suốt app — nếu 2 route khác nhau cùng cần 1 dữ liệu, React Query tự dùng lại cache thay vì fetch lại, còn loader mặc định gắn liền với vòng đời của route đó, không tận dụng cache chung dễ dàng bằng.

Ngoài ra nếu dùng loader thì phải thiết kế lại toàn bộ cách gọi API theo pattern của React Router, trong khi dự án đã có sẵn cả 1 tầng data layer dùng React Query (custom hooks, query key structure, invalidation logic...) — chuyển sang loader sẽ phải viết lại gần như từ đầu mà lợi ích tăng thêm không nhiều, nên team quyết định giữ nguyên React Query cho phần fetching, chỉ dùng Data Router cho phần routing.

a. Nếu bị hỏi tiếp: "Vậy có mất lợi ích gì của loader không (ví dụ tránh loading spinner, fetch trước khi render)?"

Có, cái đánh đổi là mất khả năng fetch dữ liệu song song với việc render route (loader chạy trước khi component mount, tránh được 1 lần loading spinner ban đầu). Với cách dùng React Query trong component, vẫn có khoảng thời gian ngắn hiển thị loading state trước khi data về. Tuy nhiên vì các page trong dự án không quá nhạy cảm với vài trăm ms loading ban đầu, và lợi ích về caching/reusability của React Query lớn hơn, nên team chấp nhận đánh đổi này.

### 9.Formik/Yup vs React Hook Form — vì sao dự án dùng cả hai, tiêu chí chọn cho từng use case?

Thực ra không phải 1 dự án dùng cả 2 thư viện, mà là 2 dự án khác nhau ở 2 thời điểm khác nhau dùng 2 lựa chọn khác nhau. Swift là dự án em tham gia từ 2022, lúc đó team dùng Formik kết hợp Yup để validate. Còn Oneloyalty là dự án mới hơn, bắt đầu từ 2024, lúc này team chuyển sang dùng React Hook Form kết hợp Yup — Yup thì vẫn giữ nguyên vai trò định nghĩa schema validation ở cả 2 dự án, chỉ khác thư viện quản lý form.

Việc đổi sang React Hook Form ở dự án mới là quyết định của team/senior, không phải em trực tiếp chốt, nhưng em hiểu lý do là React Hook Form có hiệu năng tốt hơn — vì nó dùng uncontrolled input (dựa trên ref) nên hạn chế re-render không cần thiết khi người dùng gõ, trong khi Formik theo mặc định là controlled input nên mỗi lần gõ đều trigger re-render toàn bộ form. Với form phức tạp, nhiều field (như các form setting trong Oneloyalty), React Hook Form giúp mượt hơn rõ rệt.

a. Nếu bị hỏi tiếp: "Vậy vì sao vẫn giữ Yup ở cả 2, không đổi sang Zod hay validation khác?"

Yup được giữ lại vì đã quen thuộc với team từ dự án Swift, và cả Formik lẫn React Hook Form đều hỗ trợ tích hợp Yup qua resolver (@hookform/resolvers/yup cho React Hook Form) nên không cần viết lại toàn bộ schema validation khi đổi dự án. Nếu bắt đầu dự án hoàn toàn mới bây giờ, có thể team sẽ cân nhắc Zod vì tích hợp TypeScript tốt hơn (tự infer type từ schema), nhưng với Yup thì cũng đã hoạt động ổn định nên chưa có động lực đổi.

### 10.WebSocket (Pusher) dùng để làm gì trong sản phẩm? Xử lý reconnect, mất kết nối, đồng bộ state ra sao?

Trong OneLoyalty, Pusher được dùng cho 2 tính năng: thông báo tiến trình import customer từ file CSV (thành công/thất bại) trong khi merchant vẫn thao tác các tính năng khác, và tính năng scan/tạo customer persona để merchant biết chân dung khách hàng của cửa hàng mình. Trong Swift, Pusher dùng để thông báo tiến trình optimize theme — đang ở bước minify CSS hay minify JS.

Về reconnect và mất kết nối, tụi tôi không tự viết logic riêng mà dựa vào cơ chế mặc định của pusher-js — thư viện tự quản lý connection state, tự động retry kết nối lại khi mất mạng và tự re-subscribe lại channel sau khi reconnect thành công. Về đồng bộ state, do các use case này đều là thông báo tiến trình một chiều từ backend (source of truth), nên nếu client có bỏ lỡ 1-2 event trung gian trong lúc mất kết nối cũng không ảnh hưởng — khi nhận lại event mới nhất, UI vẫn phản ánh đúng trạng thái hiện tại, nên chưa cần xây thêm cơ chế đồng bộ phức tạp hơn.

a. câu hỏi mở: 'vậy nếu cần đồng bộ chặt hơn thì sẽ làm gì?'

- Có thể thêm cơ chế polling fallback: nếu Pusher mất kết nối quá lâu, gọi API để lấy trạng thái mới nhất thay vì chỉ chờ event.
- Dùng presence channel hoặc lưu last_event_id/timestamp để khi reconnect, client có thể query lại các event đã bỏ lỡ từ backend.
- Với use case quan trọng hơn (giao dịch tài chính, redeem point real-time), cần thiết kế idempotent + versioned state thay vì tin tưởng hoàn toàn vào delivery của Pusher.

### 11.Component-Driven Development (CDD) áp dụng thế nào trong team bạn (Storybook? testing?)?

Team em không dùng Storybook hay tool chuyên biệt nào để catalog component. Cách team áp dụng CDD là theo hướng thực tế hơn: trong lúc phát triển feature, nếu phát hiện 1 component (button, modal, table, form field...) được dùng lặp lại ở nhiều nơi — cả trong admin app lẫn extension — thì sẽ tách nó ra đưa vào packages/ui để dùng chung, thay vì để mỗi feature tự viết lại UI riêng.

Cách làm này giúp giảm duplicate code đáng kể — như em có nhắc ở phần Turborepo, có hơn 40 component được gom về dùng chung theo cách này. Điểm hạn chế là vì không có Storybook nên việc test/preview component độc lập trước khi tích hợp vào page sẽ khó hơn, và nếu có thay đổi props/behavior của 1 shared component thì cũng khó kiểm tra hết các nơi đang dùng nó — phải rely vào TypeScript type check và test thủ công trên từng feature dùng lại.

a. Nếu bị hỏi tiếp "vậy có định thêm Storybook không?"

Em nghĩ đây là điểm team có thể cải thiện thêm — nếu packages/ui phát triển lớn hơn, có Storybook sẽ giúp: (1) preview/test component độc lập mà không cần chạy cả app, (2) làm tài liệu sống cho các prop/variant sẵn có, tránh việc dev không biết component đã tồn tại nên viết lại một cái tương tự, (3) dễ review UI hơn trong PR. Hiện tại quy mô team và số lượng component có lẽ chưa đến mức cần thiết ngay, nhưng đây sẽ là bước tiếp theo hợp lý khi packages/ui lớn dần.

### 12. Trong monorepo nhiều package, bạn quản lý versioning giữa các package dùng chung như thế nào?

Team em dùng Turborepo với workspace protocol, nên các package dùng chung như packages/ui, packages/i18n được các app trong cùng monorepo tham chiếu trực tiếp qua local path (workspace:*) thay vì cài qua registry với version cụ thể. Vì vậy team không cần quan tâm đến semantic versioning cho các package nội bộ này — sửa code trong package là các app dùng chung thấy thay đổi ngay lập tức, không cần bump version hay publish lại.

Đây cũng chính là lý do tụi em chuyển từ GitLab Package Registry (lúc đó phải publish version mới mỗi lần sửa UI) sang Turborepo workspace — để loại bỏ hẳn overhead quản lý version thủ công đó.

a. Nếu bị hỏi tiếp "vậy nếu sau này cần publish package ra ngoài monorepo (cho dự án khác dùng) thì sao?"

Nếu cần publish ra ngoài monorepo, tụi em sẽ cần công cụ quản lý version chuyên biệt như Changesets — nó cho phép mỗi package tự track version riêng, tự generate changelog dựa trên các thay đổi được đánh dấu (changeset), và publish có kiểm soát semver (major/minor/patch) thay vì để 1 người tự quyết định version bằng tay. Nhưng hiện tại các package trong dự án em chỉ dùng nội bộ giữa các app trong cùng monorepo nên chưa cần tới bước này.

### 13.Zustand vs Redux Toolkit: Dự án dùng cả hai ở đâu, tiêu chí chọn cái nào cho state nào? Zustand xử lý persist/middleware ra sao so với Redux Toolkit?

Thật ra 2 dự án không dùng chung/dùng cả hai cùng lúc, mà mỗi dự án chọn 1 thư viện riêng ở 2 thời điểm khác nhau: Swift (bắt đầu 2022) dùng Redux Toolkit, còn Oneloyalty (bắt đầu 2024) dùng Zustand.

- Redux Toolkit thời điểm 2022 đã là chuẩn phổ biến, có DevTools mạnh để debug state, pattern rõ ràng (slice, reducer, action) phù hợp với 1 codebase lớn nhiều người maintain, dễ trace được state thay đổi từ đâu.

- Zustand thì gọn nhẹ — không cần boilerplate action/reducer/dispatch như Redux, chỉ cần 1 hook store đơn giản, giảm lượng code viết cho mỗi phần state mới. Vì phần lớn state phức tạp/đồng bộ với server đã được React Query đảm nhiệm rồi, nên phần client state còn lại (UI state, filter, wizard step...) không cần đến sức mạnh đầy đủ của Redux nữa — Zustand vừa đủ.

## PHẦN 3. Câu hỏi hệ thống/thiết kế (thường gặp ở level Middle→Senior)

### 1. Thiết kế 1 tính năng bảng dữ liệu lớn (nghìn dòng) có filter/sort/pagination — bạn sẽ kiến trúc thế nào (client-side vs server-side, virtualization)?

Với bảng dữ liệu nghìn dòng có filter/sort/pagination, em sẽ ưu tiên server-side cho cả 3 thao tác thay vì client-side, vì lý do: nếu để client-side thì phải tải hết toàn bộ nghìn dòng về trước — tốn băng thông, chậm lần load đầu, và tốn bộ nhớ trình duyệt khi filter/sort trên tập dữ liệu lớn. Server-side thì mỗi lần filter/sort/đổi trang chỉ cần gọi API với params tương ứng (search, sortBy, sortOrder, page/cursor), BE trả về đúng phần dữ liệu cần hiển thị.

Về virtualization, em sẽ dùng khi UI theo hướng infinite scroll (dùng cursor pagination, load thêm rồi nối dồn vào danh sách hiện có) — lúc này số dòng trong DOM có thể lên tới hàng nghìn nếu không kiểm soát, nên cần TanStack Virtual để chỉ render các dòng đang nằm trong viewport, tránh browser phải giữ và tính layout cho toàn bộ nghìn dòng cùng lúc gây lag. Ngược lại nếu dùng offset pagination với mỗi trang chỉ 20-50 dòng thì không cần virtualization, vì số dòng render mỗi lần đã đủ nhỏ.

Về debounce cho filter input, em sẽ debounce khoảng 300-500ms trước khi bắn API để tránh gọi API liên tục mỗi lần gõ phím.

### 2. Nếu phải thiết kế lại toàn bộ data layer từ đầu cho 1 dự án mới, bạn sẽ chọn stack gì và vì sao?

Nếu được thiết kế lại từ đầu, em sẽ chọn stack dựa trên những bài học thực tế từ 2 dự án đã làm:

1. Server state: TanStack React Query (bản mới nhất — v5)

Toàn bộ dữ liệu từ API sẽ đi qua React Query thay vì tự quản lý loading/error/cache thủ công — điều này cả 2 dự án đã áp dụng và chứng minh hiệu quả rõ (giảm code thừa, cache tự động, tránh over-fetch).

2. Client state: Zustand

Cho state thuần UI (filter, wizard step, theme...). Như em có phân tích ở câu Zustand vs Redux — vì phần lớn state phức tạp đã có React Query lo, client state còn lại thường đơn giản, không cần đến độ cứng nhắc/boilerplate của Redux Toolkit nữa.

3. Type safety: Strict TypeScript ngay từ đầu: tránh không khai báo rõ kiểu dữ liệu

4. Nếu dùng GraphQL: thêm graphql-codegen ngay từ đầu

em sẽ đưa codegen vào ngay từ ngày đầu để type luôn đồng bộ với schema, tránh rủi ro khi API đổi mà không có gì báo động sớm.

5. Validation: cân nhắc Zod thay vì Yup

Về mặt kỹ thuật, Yup cũng hỗ trợ InferType để suy ra type từ schema, không phải là không làm được. Điểm khác biệt thực sự nằm ở chỗ Zod được thiết kế TypeScript-first ngay từ đầu nên việc suy luận type chính xác hơn với các schema phức tạp, còn Yup thêm phần này sau nên có 1 số trường hợp phức tạp suy luận type chưa mượt bằng

6. Nếu là monorepo nhiều package dùng chung ra ngoài: dùng Changesets ngay từ đầu

Thay vì để version tăng thủ công/không track changelog như package speed-auditing cũ — Changesets giúp mỗi thay đổi được khai báo rõ loại (patch/minor/major), tự sinh changelog, tránh việc 2 team cùng dev phải tự thống nhất bằng lời.

7. Kiến trúc dự án em nghĩ tùy giai đoạn dự án. Có 2 kiến trúc em sẽ cân nhắc là Feature-Driven và Feature-Sliced Design (FSD) — đây là điều em rút ra sau khi đã thực tế trải qua hành trình Feature-Driven → Layered ở Oneloyalty.

Feature-Driven nhanh, đơn giản, phù hợp giai đoạn MVP hoặc team nhỏ, phổ biến, dev mới dễ thích nghi — đúng như Oneloyalty lúc mới bắt đầu. Nhưng nhược điểm là không có ranh giới rõ giữa các feature, nên phần dùng chung dễ bị "gán bừa" vào 1 feature cụ thể rồi các feature khác import chéo vào — như case TDataRewards em từng gặp.

Nếu làm lại từ đầu với hiểu biết hiện tại, em sẽ chọn thẳng FSD thay vì đi qua bước Layered như đã từng làm ở Oneloyalty — vì FSD phù hợp dự án quy mô lớn, có bộ quy ước cộng đồng kiểm chứng, có tài liệu chính thức để dev mới tự tra cứu thay vì học theo convention riêng của từng team.

Đổi lại, FSD có overhead học tập ban đầu cao hơn, dễ over-engineering nếu áp cho dự án nhỏ/MVP — nên với dự án chưa rõ quy mô, em vẫn bắt đầu đơn giản (Feature-Driven) rồi cân nhắc chuyển dần, thay vì áp FSD cho mọi trường hợp.

### 3. Làm sao đảm bảo 1 embedded app chạy mượt trong iframe Shopify Admin (postMessage, App Bridge, giới hạn về CSP/cookie third-party)?

Để đảm bảo embedded app chạy mượt và đúng chuẩn trong iframe Shopify Admin, có mấy điểm chính:

1. CSP (frame-ancestors) — điều kiện tiên quyết để được nhúng vào iframe

Server của app phải trả header Content-Security-Policy: frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com — em có kiểm tra thực tế trên app Swift và thấy đúng header này. Nếu thiếu hoặc set sai, trình duyệt sẽ chặn không cho hiển thị app trong iframe của Admin luôn (lỗi "refused to display in a frame"). Đây là phần server/BE cấu hình, nhưng FE cần biết để hiểu vì sao app "chạy được" trong iframe.

2. Third-party cookie bị chặn → không thể dùng cookie-based session như 1 trang web thông thường

Vì app nằm trong iframe của domain khác (Shopify Admin), trình duyệt hiện đại (đặc biệt Safari, Chrome đang dần theo) chặn third-party cookie — cookie app set ra sẽ không được gửi kèm khi chạy trong iframe. Đây chính là lý do Shopify dùng session token/ID token (JWT) gửi qua header thay vì dựa vào cookie.

Em có bằng chứng cụ thể từ 1 id_token thực tế lấy từ app Swift: exp - nbf = 60 giây — tức token chỉ sống đúng 60 giây, phải liên tục lấy token mới. App Bridge tự động lo việc refresh token này ở tầng SDK, FE không cần tự quản lý vòng đời token.

3. postMessage & App Bridge — giao tiếp giữa iframe và Admin

Vì iframe và trang cha (Admin) là 2 origin khác nhau, chúng không thể trực tiếp gọi hàm/đọc DOM của nhau — đây là giới hạn bảo mật same-origin policy của trình duyệt. postMessage là cơ chế chuẩn để 2 cửa sổ khác origin gửi tin nhắn qua lại an toàn, và App Bridge là thư viện Shopify xây trên nền đó, đóng gói thành API dễ dùng: lấy id_token, điều hướng trang, mở modal/toast, resize iframe... đều thực chất là trao đổi message qua lại giữa app và Admin.

4. Để app "chạy mượt" trong thực tế:

Dùng App Bridge để điều hướng/tương tác thay vì thao tác trực tiếp window.top hay full page reload.
Không tự quản lý session bằng cookie, dựa vào id_token lấy qua App Bridge cho mọi API call.
Hạn chế số lần round-trip postMessage không cần thiết giữa iframe và Admin, vì mỗi lần đều có độ trễ nhất định dù nhỏ.
