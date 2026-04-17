-- ⚠️ DESTRUCTIVE: Xóa toàn bộ bảng ứng dụng hiện tại
-- Chạy file này TRƯỚC, rồi chạy tiếp schema.sql để tạo lại từ đầu.

begin;

drop table if exists task_history cascade;
drop table if exists tasks cascade;

drop table if exists meeting_attendees cascade;
drop table if exists meeting_minutes cascade;
drop table if exists meetings cascade;

drop table if exists kpi_results cascade;
drop table if exists kpi_metrics cascade;

drop table if exists vice_director_departments cascade;
drop table if exists users cascade;
drop table if exists departments cascade;
drop table if exists roles cascade;

commit;
