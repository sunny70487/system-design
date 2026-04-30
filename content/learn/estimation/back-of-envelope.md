---
slug: back-of-envelope
title: 容量估算與延遲數字
group: estimation
order: 0
summary: 系統設計面試常用的延遲數字（Jeff Dean）、容量單位、QPS 估算範例。
sources:
  - name: system-design-primer-zh-tw
    url: https://github.com/kevingo/system-design-primer-zh-tw
    license: CC-BY-SA-4.0
    sections:
      - 附錄
      - 每個程式設計師都應該知道的延遲數字
related_questions:
  - twitter
  - youtube
related_chapters:
  - scalability
updated: '2026-04-30'
---

# 容量估算與延遲數字

系統設計面試中，面試官期望你能快速估算系統規模。這需要兩項基礎：延遲數字的直覺和容量單位的換算。

## 每個工程師應該記住的延遲數字

來自 Jeff Dean 的經典數據（2012 年），數量級至今仍然適用：

| 操作 | 延遲 |
|------|------|
| L1 cache reference | 0.5 ns |
| Branch mispredict | 5 ns |
| L2 cache reference | 7 ns |
| Mutex lock/unlock | 25 ns |
| Main memory reference | 100 ns |
| Compress 1 KB with Zippy | 3 μs |
| Send 2 KB over 1 Gbps network | 20 μs |
| Read 1 MB sequentially from memory | 250 μs |
| Round trip within same datacenter | 500 μs |
| Read 1 MB sequentially from SSD | 1 ms |
| Disk seek | 10 ms |
| Read 1 MB sequentially from disk | 20 ms |
| Send packet CA → Netherlands → CA | 150 ms |

**記憶技巧：**

- 記憶體操作 = ns 級
- SSD 操作 = μs–ms 級
- 磁碟尋軌 = ms 級
- 跨大陸網路 = 100+ ms 級

## 容量單位

| 單位 | 位元組數 | 常見用途 |
|------|----------|----------|
| 1 KB | 10³ (1,000) | 一筆推文、一封短 email |
| 1 MB | 10⁶ (1,000,000) | 一張高解析圖片 |
| 1 GB | 10⁹ | 一部電影（壓縮後） |
| 1 TB | 10¹² | 一台 DB server 的磁碟 |
| 1 PB | 10¹⁵ | 大型服務的日誌量級 |

**快速換算：**

- 1 天 = 86,400 秒 ≈ **10 萬秒**
- 1 月 ≈ 250 萬秒 ≈ **2.5 × 10⁶ 秒**

## QPS 估算範例：Twitter 時間線

**已知條件：**

- 月活躍使用者（MAU）：3 億
- 日活躍使用者（DAU）：約 2 億（MAU 的 ~67%）
- 每位使用者平均每天瀏覽時間線 10 次

**估算過程：**

```
讀取 QPS = DAU × 每人每日請求數 ÷ 每日秒數
         = 200,000,000 × 10 ÷ 86,400
         ≈ 23,000 QPS（平均）

尖峰 QPS ≈ 平均 × 5 = 115,000 QPS
```

**寫入端：**

```
假設每位使用者平均每天發文 2 次
寫入 QPS = 200,000,000 × 2 ÷ 86,400
         ≈ 4,600 QPS（平均）
```

**讀寫比 ≈ 5:1**，這是典型的讀多寫少系統。

## 儲存量估算範例

**已知條件：**

- 每天新增 4 億條推文（DAU 2 億 × 每人 2 條）
- 每條推文平均 250 bytes（純文字）
- 20% 附帶圖片（平均 500 KB）、5% 附帶影片（平均 5 MB）

```
文字：4 億 × 250 B = 100 GB/天
圖片：4 億 × 20% × 500 KB = 40 TB/天
影片：4 億 × 5% × 5 MB = 100 TB/天

每日總量 ≈ 140 TB
每年 ≈ 140 TB × 365 ≈ 51 PB
```

> **面試技巧：** 把計算過程寫在白板上，讓面試官看到你的推導。答案的數量級比精確值重要。

---

> 內容改寫自 [system-design-primer-zh-tw](https://github.com/kevingo/system-design-primer-zh-tw)（CC-BY-SA 4.0）
