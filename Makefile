.PHONY: dev build check clean install test lint fmt rust-check rust-test rust-fmt rust-clippy frontend-dev frontend-build icons help

# ============================================================
# Skills Manager — Development Commands
# ============================================================

## — 常用命令 —

help: ## 显示帮助信息
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## 安装所有依赖
	pnpm install

dev: ## 启动开发服务器 (Tauri + Vite HMR)
	cd apps/desktop && pnpm tauri dev

dev-debug: ## 启动开发服务器 (带 Rust 调试日志)
	cd apps/desktop && RUST_LOG=debug pnpm tauri dev

dev-frontend: ## 仅启动前端 (浏览器调试, http://localhost:1420)
	cd apps/desktop && pnpm dev

build: ## 构建发布版本
	cd apps/desktop && pnpm tauri build

build-debug: ## 构建调试版本
	cd apps/desktop && pnpm tauri build --debug

## — 检查 & 测试 —

check: rust-check frontend-build ## 全量检查 (Rust + 前端)

test: rust-test ## 运行所有测试

lint: rust-clippy ## 运行 lint 检查

fmt: rust-fmt ## 格式化代码

## — Rust 后端 —

rust-check: ## Rust 编译检查
	cd apps/desktop/src-tauri && cargo check

rust-test: ## 运行 Rust 测试
	cd apps/desktop/src-tauri && cargo test

rust-clippy: ## Rust clippy 检查
	cd apps/desktop/src-tauri && cargo clippy -- -D warnings

rust-fmt: ## 格式化 Rust 代码
	cd apps/desktop/src-tauri && cargo fmt

rust-fmt-check: ## 检查 Rust 格式 (不修改)
	cd apps/desktop/src-tauri && cargo fmt -- --check

rust-doc: ## 生成 Rust 文档
	cd apps/desktop/src-tauri && cargo doc --open

## — 前端 —

frontend-build: ## 构建前端
	cd apps/desktop && npx vite build

frontend-preview: ## 预览前端构建产物
	cd apps/desktop && npx vite preview

typecheck: ## TypeScript 类型检查
	cd apps/desktop && npx tsc --noEmit

## — 清理 —

clean: ## 清理所有构建产物
	cd apps/desktop/src-tauri && cargo clean
	rm -rf apps/desktop/dist
	rm -rf node_modules apps/desktop/node_modules packages/core/node_modules

clean-rust: ## 仅清理 Rust 构建产物
	cd apps/desktop/src-tauri && cargo clean

clean-frontend: ## 仅清理前端构建产物
	rm -rf apps/desktop/dist

## — 工具 —

icons: ## 重新生成应用图标 (需要 python3)
	@cd apps/desktop/src-tauri && python3 -c "\
	import struct, zlib; \
	def png(w,h,f): \
	    mk=lambda t,d: struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff); \
	    r=b''; \
	    [r:=r+b'\x00'+bytes([99,102,241,255])*w for _ in range(h)]; \
	    open(f,'wb').write(b'\x89PNG\r\n\x1a\n'+mk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+mk(b'IDAT',zlib.compress(r))+mk(b'IEND',b'')); \
	png(32,32,'icons/32x32.png'); png(128,128,'icons/128x128.png'); png(256,256,'icons/128x128@2x.png'); \
	print('Icons generated')"

loc: ## 统计代码行数
	@echo "=== Rust ==="
	@find apps/desktop/src-tauri/src -name '*.rs' | xargs wc -l | tail -1
	@echo "=== TypeScript/React ==="
	@find apps/desktop/src packages/core/src -name '*.ts' -o -name '*.tsx' | xargs wc -l | tail -1

tree: ## 显示项目结构
	@tree -I 'node_modules|target|dist|.git|icons' --dirsfirst -L 4
