#!/bin/bash
# =============================================================================
# AI Weekly Report Docker 镜像构建与打包脚本
# =============================================================================
# 用法:
#   ./build-and-package.sh [版本号]
#
# 示例:
#   ./build-and-package.sh           # 使用 VERSION 文件中的版本号
#   ./build-and-package.sh 1.0.0     # 指定版本号
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取版本号
get_version() {
    if [ -n "$1" ]; then
        # 使用命令行参数指定的版本号
        VERSION="$1"
        log_info "使用指定的版本号: $VERSION"
    elif [ -f "VERSION" ]; then
        # 从 VERSION 文件读取
        VERSION=$(cat VERSION | tr -d '[:space:]')
        log_info "从 VERSION 文件读取版本号: $VERSION"
    else
        # 使用默认版本号
        VERSION="1.0.0"
        log_warn "未找到 VERSION 文件，使用默认版本号: $VERSION"
    fi
}

# 检查必要文件
check_required_files() {
    log_info "检查必要文件..."

    local missing=0

    if [ ! -f "Dockerfile.deploy" ]; then
        log_error "Dockerfile.deploy 不存在"
        missing=1
    fi

    if [ ! -f "deploy.sh" ]; then
        log_warn "deploy.sh 不存在（可选，但建议一起打包）"
    fi

    if [ $missing -eq 1 ]; then
        log_error "缺少必要文件，构建终止"
        exit 1
    fi

    log_success "文件检查通过"
}

# 检查 Docker 环境
check_docker() {
    log_info "检查 Docker 环境..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    # 检查 Docker 是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker 未启动，请先启动 Docker"
        exit 1
    fi

    log_success "Docker 环境检查通过"
}

# 构建 Docker 镜像
build_image() {
    log_info "构建 Docker 镜像..."
    log_info "镜像名称: ai-weekly-report:$VERSION"
    log_info "Dockerfile: Dockerfile.deploy"

    docker build \
        -f Dockerfile.deploy \
        -t "ai-weekly-report:$VERSION" \
        -t "ai-weekly-report:latest" \
        .

    log_success "镜像构建完成"
}

# 打包镜像
package_image() {
    log_info "打包 Docker 镜像..."
    log_info "输出文件: ai-weekly-report-$VERSION.tar.gz"

    # 删除已存在的打包文件
    if [ -f "ai-weekly-report-$VERSION.tar.gz" ]; then
        log_warn "删除已存在的打包文件"
        rm -f "ai-weekly-report-$VERSION.tar.gz"
    fi

    # 导出并压缩镜像
    docker save "ai-weekly-report:$VERSION" | gzip > "ai-weekly-report-$VERSION.tar.gz"

    log_success "镜像打包完成"
}

# 显示结果
show_result() {
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  构建与打包完成!${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo "版本号: $VERSION"
    echo ""
    echo "生成的文件:"
    ls -lh "ai-weekly-report-$VERSION.tar.gz" 2>/dev/null || echo "  - ai-weekly-report-$VERSION.tar.gz"
    echo ""
    echo "镜像信息:"
    docker images "ai-weekly-report:$VERSION" --format "  名称: {{.Repository}}:{{.Tag}}\n  大小: {{.Size}}\n  创建时间: {{.CreatedAt}}"
    echo ""
}

# 显示部署指导
show_deploy_guide() {
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  部署到服务器指导${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo "1. 上传以下文件到服务器目标目录:"
    echo ""
    echo "   必需文件:"
    echo "     - deploy.sh"
    echo "     - VERSION"
    echo "     - ai-weekly-report-$VERSION.tar.gz"
    echo ""
    echo "   可选文件 (如果有自定义配置):"
    echo "     - docker-compose.deploy.yml"
    echo ""
    echo "2. 在服务器上执行部署命令:"
    echo ""
    echo -e "   ${YELLOW}chmod +x deploy.sh${NC}"
    echo -e "   ${YELLOW}./deploy.sh install${NC}  # 首次部署"
    echo ""
    echo "   或 (如果是更新):"
    echo -e "   ${YELLOW}./deploy.sh update${NC}   # 更新镜像并重启"
    echo ""
    echo "3. 其他常用命令:"
    echo -e "   ${YELLOW}./deploy.sh logs${NC}     # 查看日志"
    echo -e "   ${YELLOW}./deploy.sh status${NC}   # 查看状态"
    echo -e "   ${YELLOW}./deploy.sh backup${NC}   # 备份数据"
    echo ""
    echo -e "${GREEN}==========================================${NC}"
}

# 清理旧镜像 (可选)
cleanup_old_images() {
    log_info "清理旧的未使用镜像..."

    # 只清理 dangling 镜像和旧的 ai-weekly-report 镜像（保留当前版本和 latest）
    docker image prune -f --filter "dangling=true" 2>/dev/null || true

    # 列出其他版本的 ai-weekly-report 镜像
    local old_images
    old_images=$(docker images "ai-weekly-report" --format "{{.Repository}}:{{.Tag}} {{.ID}}" | grep -v "$VERSION" | grep -v "latest" | awk '{print $2}' || true)

    if [ -n "$old_images" ]; then
        log_warn "发现旧版本镜像，是否删除? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "$old_images" | xargs -r docker rmi -f 2>/dev/null || true
            log_success "旧镜像已清理"
        fi
    fi
}

# 主函数
main() {
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  AI Weekly Report Docker 构建与打包${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""

    # 获取版本号
    get_version "$1"

    # 检查环境
    check_required_files
    check_docker

    echo ""
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}  开始构建${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""

    # 构建和打包
    build_image
    package_image

    # 显示结果
    show_result

    # 询问是否清理旧镜像
    cleanup_old_images

    # 显示部署指导
    show_deploy_guide
}

# 执行主函数
main "$@"
