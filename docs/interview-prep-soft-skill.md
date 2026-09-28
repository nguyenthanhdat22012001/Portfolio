## PHẦN 4. Câu hỏi hành vi / soft-skill (gần như chắc chắn sẽ gặp)

### 1. Kể một lần bạn bất đồng ý kiến kỹ thuật với senior/leader — xử lý ra sao?

_Bản này giờ có đủ 4 phần: bối cảnh, bất đồng cụ thể (2 chiều lý lẽ), quá trình xử lý (tranh luận + đề xuất kế hoạch giảm rủi ro), và kết quả/bài học._

Em nhớ đợt Oneloyalty đang revamp gần như toàn bộ tính năng, deadline khá gấp. Lúc đó anh senior đang chuyển 2 repo (admin, extension) sang Turborepo để gom UI dùng chung, tránh duplicate. Trong lúc chuyển thử 1 feature qua source mới để test build, ảnh phát hiện feature đó đang import hook và type chéo từ feature khác — source cũ đang theo Feature-Driven. Từ đó ảnh nảy ra ý muốn đổi luôn sang Layered Architecture để dứt điểm vấn đề này, và dễ migrate công nghệ khác sau này.

Đây là lúc em không đồng ý — em cho rằng chuyển Turborepo + gom UI dùng chung đã tốn khá nhiều thời gian rồi, giờ đổi thêm cả kiến trúc nữa thì coi như đập đi xây lại toàn bộ, rủi ro trễ deadline revamp. Em cũng nêu thêm vài nhược điểm của Layered lúc đó em nghĩ tới: dự án scale theo chiều dọc nên debug 1 feature phải nhảy qua lại nhiều file/layer, dễ phân tán tập trung; và vì các layer đều là "dùng chung" nên khi 1 feature không dùng nữa cũng khó biết chắc để xoá sạch, không gọn như Feature-Driven (xoá cả folder feature là xong).

Tụi em tranh luận qua lại từng điểm đó. Anh senior thì giữ quan điểm — ảnh là người trực tiếp làm phần migrate nên thấm rõ nhất "nỗi đau" bị import hook/type lẫn lộn giữa các feature, và lo ngại nếu không xử lý sớm thì sau này càng khó gỡ. Cuối cùng em đồng ý làm theo hướng của ảnh, nhưng tụi em thống nhất 1 kế hoạch để giảm rủi ro thời gian: migrate sang Layered theo từng feature một, ưu tiên feature nào bị nhiều feature khác import nhất trước (như Rewards), còn lại thì ai đang phụ trách feature nào thì tự migrate feature đó theo kiến trúc mới. Phần gom UI dùng chung thì làm song song, không chặn tiến độ revamp — ai đang code feature thì tập trung code, người rảnh hơn thì tranh thủ migrate/gom UI dần.

Kết quả là dự án kịp deadline revamp tính năng và hoàn thành chuyển sang Layered Architecture đúng hạn. Phần gom UI dùng chung thì kéo dài thêm khoảng 1 tuần sau đó vì không ảnh hưởng nhiều đến tiến độ chính. Trong quá trình làm song song nhiều người cùng migrate, cũng có vài lần conflict code, thậm chí mất code mới của nhau, nhưng anh em thông cảm, check lại git history để merge/convert lại cho đúng.

Nhìn lại, lo ngại ban đầu của em về việc tốn thời gian là đúng thật — việc migrate rõ ràng có tốn thêm thời gian và công sức. Nhưng nhờ cách chia nhỏ theo kế hoạch (ưu tiên feature quan trọng trước, gom UI làm song song không chặn tiến độ), việc migrate không trở nên nghiêm trọng đến mức ảnh hưởng deadline chính — mục tiêu revamp xong tính năng vẫn đạt được. Bài học em rút ra là: bất đồng ý kiến không có nghĩa 1 trong 2 người phải đúng hoàn toàn — quan trọng là sau khi tranh luận, tìm được cách triển khai giảm thiểu được rủi ro mà cả 2 phía lo ngại, thay vì chỉ tranh cãi ai đúng ai sai.

### 2. Kể một lỗi nghiêm trọng bạn từng gây ra ở production — cách bạn phát hiện, fix, và rút kinh nghiệm?

Lỗi liên quan đến convert timezone giữa server và store merchant. Lúc đó em đang làm setting cho tính năng campaign — có phần chọn thời gian bắt đầu và kết thúc campaign. Khi nhận data từ BE, thời gian trả về không kèm timezone (tức là giờ theo server), nhưng em không convert sang timezone của store trước khi hiển thị lên form. Nên nếu merchant sửa lại giờ (theo giờ địa phương của họ) rồi lưu, giá trị lưu lại thực chất bị hiểu nhầm là giờ server — dẫn đến thời gian chạy thực tế của campaign bị lệch so với ý định của merchant.

Lỗi này may mắn được QC bắt kịp ở môi trường staging trước khi lên production — QC test set campaign chạy ngay lúc đó nhưng không thấy hiện trên storefront, tụi em thảo luận và xác định do thời gian lưu bị lệch timezone. Em fix trong ngày, mất khoảng 5-6 tiếng từ lúc QC báo, bằng cách thêm function xử lý convert timezone riêng cho setting campaign.

Nhưng vấn đề thật sự nghiêm trọng hơn xuất hiện sau đó: sau khi fix xong, em tự liên tưởng ra rằng các chỗ khác trong app cũng hiển thị ngày giờ tương tự — như lịch sử log earn/redeem point, log charge plan — nên chủ động rà soát lại (không ai report, không ai yêu cầu). Kết quả phát hiện đúng là các log này đã lên production và hiển thị sai timezone suốt vài tháng trời mà không ai biết — vì đây chỉ là hiển thị thông tin, không phá vỡ chức năng nào rõ ràng nên không ai để ý hay report. Merchant nhìn log có thể đã hiểu sai thời điểm hành động thực tế diễn ra suốt thời gian đó mà không hay biết.

Em xử lý bằng cách tạo 1 hook dùng chung để convert timezone, áp dụng thống nhất cho tất cả nơi cần hiển thị ngày giờ theo timezone store.

Bài học rút ra: đây không chỉ là 1 lỗi đơn lẻ mà là 1 "loại lỗi" (class of bug) — khi phát hiện 1 chỗ sai, nên chủ động rà lại toàn bộ những chỗ có pattern tương tự thay vì chỉ vá đúng chỗ được báo. Ngoài ra, việc lỗi tồn tại vài tháng mà không ai phát hiện cũng cho thấy team lúc đó thiếu cơ chế kiểm tra tính đúng đắn của dữ liệu hiển thị (như code review checklist cho các chỗ xử lý ngày giờ).

### 3. Bạn quản lý deadline gấp + chất lượng code như thế nào khi phải đánh đổi?

Nguyên tắc chung của em khi deadline gấp là: ưu tiên đúng chức năng và đúng tiến độ trước, chấp nhận nợ kỹ thuật có kiểm soát (biết rõ mình đang đánh đổi cái gì), rồi tranh thủ trả nợ khi có thời gian rảnh ở các sprint sau — chứ không để nợ kỹ thuật đó tồn tại vĩnh viễn.

Ví dụ cụ thể là giai đoạn Oneloyalty làm bản MVP, team chỉ có 2 dev FE, cần phát hành nhanh. Lúc đó em phụ trách các tính năng liên quan reward như setting VIP tier, setting redeem point/reward. Vì thời gian gấp, mỗi người chỉ tập trung hiểu rõ phần feature mình làm, chưa có thời gian nhìn tổng thể toàn app. BE lúc đó trả dữ liệu reward ở 2 tính năng theo 2 dạng khác nhau, nên em tưởng đó là 2 khái niệm reward khác nhau, không phân tích sâu mà tạo type dữ liệu và function hiển thị summary reward riêng cho từng feature — dẫn đến bị duplicate.

Sau khi lên bản MVP, em mới nhận ra thực chất BE chỉ đang trả 2 dạng khác nhau của cùng 1 khái niệm (ví dụ đều là free ship) — tức là do hiểu chưa đủ ngay từ đầu chứ không phải 2 khái niệm thật sự khác nhau. Ở các sprint sau, mỗi khi rảnh sau khi hoàn thành task trong sprint, em tranh thủ refactor gom các type và function liên quan đến reward về 1 nơi dùng chung, thay vì để duplicate mãi.

Về chất lượng, bản MVP có vài lỗi vặt không nghiêm trọng, đều phát hiện và fix trong ngày nhờ QC test kỹ. Cuối cùng bản MVP phát hành đúng tiến độ.

Thực ra chính phần dữ liệu reward duplicate này về sau lại trở thành 1 phần của vấn đề coupling chéo mà em từng kể ở case migrate sang Layered Architecture — type TDataRewards ban đầu nằm trong 1 feature cụ thể rồi bị nhiều feature khác import vào chính là hệ quả kéo dài từ quyết định đánh đổi ở giai đoạn MVP này. Bài học em rút ra là: nợ kỹ thuật nếu không được rà soát và trả đúng lúc, có thể âm ỉ lớn dần theo thời gian và trở thành vấn đề kiến trúc nghiêm trọng hơn nhiều so với lúc mới phát sinh — sau này em cố gắng chủ động hơn trong việc nhìn lại và dọn dẹp nợ kỹ thuật sớm nhất có thể, thay vì để tích tụ.

### 4. Vì sao bạn muốn rời công ty hiện tại / tìm cơ hội mới? (câu này gần như chắc chắn được hỏi — nên chuẩn bị câu trả lời khéo léo, tích cực)

Công ty em đang làm gần đây có đợt cắt giảm nhân sự, lý do chính là các dự án em tham gia (Oneloyalty, Swift) đã bước vào giai đoạn maintenance — tính năng chính đã ổn định, không cần nhiều dev phát triển mới nữa như giai đoạn build sản phẩm trước đó. Đây là quyết định về mặt kinh doanh của công ty, không liên quan đến đánh giá năng lực cá nhân.

Với em, đây cũng là dịp tốt để tìm 1 môi trường mới có nhiều bài toán để giải quyết hơn, giúp em phát triển tiếp lên vai trò Senior — thay vì tiếp tục ở giai đoạn maintenance ít có cơ hội xây dựng tính năng mới hay đối mặt thử thách kỹ thuật lớn.

--

** a. Nếu bị hỏi thêm: "Vậy tại sao công ty không giữ lại bạn, chuyển bạn sang dự án khác?" **

Công ty cũng có rà soát xem có dự án nào khác đang cần dev không, nhưng đợt cắt giảm diễn ra ở nhiều dự án cùng lúc, mỗi dự án chỉ giữ lại rất ít người — thường là vị trí then chốt hoặc người đã gắn bó lâu năm. Lúc đó không có dự án nào cần tuyển thêm để chuyển em sang, nên đây là quyết định tổ chức nhân sự tổng thể, không phải đánh giá riêng về năng lực cá nhân.

### 5. Bạn nhìn nhận điểm mạnh/điểm yếu của bản thân là gì với vai trò Middle→Senior?

Điểm mạnh em nghĩ là khả năng chủ động xử lý vấn đề ngay cả khi chưa rõ nguyên nhân gốc — như lúc app Swift load chậm, em chưa biết nguyên nhân nằm ở tầng auth nhưng vẫn chủ động code-split để cải thiện trước, giảm được đáng kể trước khi vấn đề gốc được xử lý. Em cũng có thói quen chủ động rà soát và dọn nợ kỹ thuật khi có cơ hội — như lần gom lại type/function reward bị duplicate, hay tự phát hiện và fix thêm các chỗ khác bị lỗi tương tự sau khi xử lý xong 1 bug chính, dù không ai yêu cầu.

Về điểm yếu, em nghĩ mình còn thiếu kinh nghiệm tự đưa ra quyết định kiến trúc/công nghệ ở quy mô lớn — phần lớn các quyết định như chọn kiến trúc dự án hay là lựa chọn các thư viện Turborepo, React Query... đều do senior quyết, vai trò của em chủ yếu là thực thi và hiểu rõ lý do sau đó chứ chưa phải người trực tiếp đề xuất và chịu trách nhiệm quyết định. Đây cũng là điều em đang chủ động cải thiện — gần đây em dành thời gian tự nghiên cứu sâu hơn để hình thành quan điểm riêng về các lựa chọn kiến trúc, ví dụ như so sánh Feature-Sliced Design với Layered Architecture, hay đánh giá Zod so với Yup — để khi có cơ hội, em có thể tự tin đảm nhận vai trò đưa ra quyết định thay vì chỉ thực thi.

### 6. Kỳ vọng mức lương / thời gian có thể bắt đầu?

Về mức lương, em kỳ vọng khoảng 22-28 triệu/tháng, tùy vào việc công ty đánh giá level của em ở đâu sau buổi phỏng vấn kỹ thuật — con số này cũng có thể linh hoạt điều chỉnh dựa trên tổng thể phúc lợi (thưởng, bảo hiểm, lộ trình tăng lương...) chứ không nhất thiết cứng nhắc theo lương gross.

Về thời gian bắt đầu, em có thể sẵn sàng đi làm trong vòng 1 tuần kể từ khi nhận offer.

## PHẦN 5. Câu hỏi định hướng senior (vì CV ghi career direction là Middle/Senior)

### 1. Bạn nghĩ khác biệt lớn nhất giữa Middle và Senior Front-End Engineer là gì? Bạn đang thiếu gì để lên Senior?

Em nghĩ khác biệt lớn nhất không nằm ở kỹ năng code (Middle giỏi vẫn code tốt như Senior), mà nằm ở phạm vi chịu trách nhiệm và mức độ mơ hồ phải tự xử lý:

Middle thường làm việc trong 1 khung đã được định sẵn — kiến trúc đã chọn, thư viện đã quyết, chỉ cần thực thi đúng, hiệu quả, chất lượng cao trong phạm vi đó. Input thường rõ ràng: "làm feature này theo pattern có sẵn".
Senior phải tự đưa ra quyết định khi không có sẵn khung — chọn kiến trúc nào cho dự án mới, đánh đổi thế nào giữa tốc độ và chất lượng khi deadline gấp, thuyết phục người khác (kể cả senior khác, non-tech stakeholder) về hướng đi mình chọn, và chịu trách nhiệm nếu quyết định đó sai. Input thường mơ hồ hơn: "dự án cần scale, bạn nghĩ nên tổ chức thế nào".

Ngoài ra Senior còn có vai trò nhân rộng năng lực — mentor người khác, review code không chỉ để bắt lỗi mà để nâng chất lượng chung của team, và nhìn được tác động của 1 thay đổi lên toàn hệ thống chứ không chỉ feature đang làm.

Về phần em đang thiếu để lên Senior: em nghĩ không phải thiếu kiến thức — qua các dự án em đã hiểu khá sâu nhiều quyết định kỹ thuật (kiến trúc, state management, xử lý performance...). Cái em thiếu là kinh nghiệm thực tế tự ra quyết định và chịu trách nhiệm với quyết định đó — hầu hết các lựa chọn lớn ở dự án cũ (Turborepo, sử dụng React Query, đổi form library...) đều do senior quyết, em đóng vai trò thực thi và hiểu rõ lý do sau đó, chứ chưa phải người trực tiếp đứng ra đề xuất và bảo vệ quyết định trước team.

Em nghĩ đây là khoảng cách có thể thu hẹp nhanh nếu được trao cơ hội — vì nền tảng tư duy đã có, chỉ thiếu môi trường thực hành vai trò ra quyết định.

### 2. Bạn từng mentor/support ai trong team chưa? Cách bạn review code cho junior?

Em chưa có vai trò mentor chính thức, vì ở cả 2 dự án em đều không phải người dẫn dắt team. Nhưng có một việc em nghĩ khá gần với việc ảnh hưởng kỹ thuật tới người khác trong team, lúc dự án Swift chuyển sang giai đoạn maintenance, team em được điều qua hỗ trợ dự án OneMobile khoảng 6 tháng. Dự án đó chia làm 2 scrum team, team em là team B. Em được giao refactor tính năng setting integrate apps, mở source ra thì thấy phần form không dùng thư viện gì, toàn tự quản lý bằng nhiều useState riêng cho isLoading, isValid, isSubmitting, logic khá rối.

Em đề xuất chuyển sang dùng react-hook-form kết hợp yup để gom logic lại gọn hơn. Sau khi refactor xong, em trao đổi với anh senior cùng team về cách tổ chức code mới, ảnh thấy hợp lý nên chủ động liên hệ team A set một buổi họp chung, lấy chính tính năng em vừa refactor làm ví dụ để đề xuất áp dụng cho các tính năng liên quan đến setting bên team A. Kết quả là team A đã áp dụng cách làm này cho toàn bộ các tính năng setting của họ. Em cũng trực tiếp giải thích thay đổi cho bạn đang phụ trách tính năng đó bên team A, vì mình là người đề xuất thay đổi trên phần code bạn ấy đã làm nên em thấy nên trao đổi rõ ràng, cũng là cách tôn trọng công sức người ta.

Ngoài ra, mỗi lần handover task em đều chủ động viết tài liệu: cách chạy dự án, tool liên quan, cấu trúc thư mục, cách build/deploy, và giải thích sơ luồng chạy chính — route khai báo ở đâu, feature mới thì tạo folder trong features, UI dùng chung giữa các repo thì đặt ở package ui... để người tiếp nhận nắm nhanh.

Còn nếu để review code cho junior, em nghĩ mình sẽ tập trung vào vài điểm mà bản thân cũng đang áp dụng: tránh trùng lặp state/type giữa các phần liên quan như vụ TDataRewards em từng gặp, khi có lỗi thì yêu cầu tìm đúng root cause thay vì fix chỗ hiển thị bug, và khuyến khích nói thẳng nếu có giới hạn/rủi ro kỹ thuật thay vì giấu đi, giống như phần thiếu auth token ở package speed-auditing em từng tự nhận ra.

** a. nếu bị hỏi thẳng "có support ai level thấp hơn không" **
có một bạn fresher từng làm cùng team khoảng 4-5 tháng, nhưng lúc đó chủ yếu anh senior trực tiếp chỉ dẫn và review, em với bạn ấy ít trao đổi, nên em nghĩ đó không phải trải nghiệm mentor rõ ràng.

### 3. Nếu được giao quyền quyết định kiến trúc (thay vì chỉ thực thi như các case ở Oneloyalty), bạn sẽ tiếp cận thế nào?

em sẽ dựa trên vài tiêu chí cụ thể thay vì chọn theo cảm tính hay theo cái quen thuộc nhất:

1. Quy mô và tốc độ scale dự kiến của dự án — dự án nhỏ, ít feature, ít dev thì Layered hoặc Feature-Driven đơn giản là đủ, không cần over-engineer ngay từ đầu. Nhưng nếu roadmap cho thấy dự án sẽ scale nhiều feature, nhiều team cùng làm song song, em sẽ nghiêng về FSD ngay từ đầu vì nó ép ranh giới rõ theo domain/feature chứ không theo layer kỹ thuật.

2. Cơ chế enforce thay vì chỉ định nghĩa quy ước — bài học lớn nhất từ Oneloyalty là: đặt tên kiến trúc thôi chưa đủ, phải có công cụ enforce (eslint-plugin-boundaries hoặc custom rule) ngay từ đầu để ranh giới không bị phá vỡ dần theo thời gian bởi deadline áp lực. Em sẽ setup lint rule ngay khi dựng kiến trúc, không đợi đến khi coupling nặng.

3. Cân bằng giữa lý thuyết và thực tế đội ngũ — kiến trúc tốt trên giấy nhưng nếu team chưa quen, đường cong học tập cao thì vẫn có rủi ro. Em sẽ trao đổi trước với team, có thể prototype một feature nhỏ theo kiến trúc mới để mọi người làm quen trước khi áp dụng toàn bộ, tránh việc ép cả team học kiến trúc mới giữa lúc chạy deadline gấp — đây cũng là bài học rút ra từ đợt migrate ở Oneloyalty.

4. Document hóa quyết định — ghi rõ lý do chọn kiến trúc, các rule cụ thể, để tránh tình trạng mỗi người hiểu một kiểu rồi dần trôi theo thời gian.

Tóm lại, khác biệt lớn nhất so với việc chỉ thực thi là: em sẽ đánh giá trước dựa trên quy mô/team/roadmap thay vì chọn kiến trúc quen tay, và bắt buộc có cơ chế enforce ngay từ đầu thay vì đợi vấn đề xảy ra rồi mới xử lý.

** a. "Vậy giữa FSD và Feature-Driven + lint riêng, bạn chọn cái nào cho dự án mới toanh, team 3-4 người?" **
=> team nhỏ, giai đoạn đầu ưu tiên tốc độ, nên bắt đầu Feature-Driven + lint boundary đơn giản, để dành FSD cho lúc team/scale lớn hơn.

** b. "Bạn có kinh nghiệm thực tế nào tự mình quyết định kiến trúc chưa, hay chỉ mới nghĩ vậy?" **
thực tế em mới ở vai trò thực thi/đề xuất trong phạm vi nhỏ (như vụ đề xuất react-hook-form/yup), chưa có quyền quyết định kiến trúc toàn dự án — nói thật để tránh overclaim.
